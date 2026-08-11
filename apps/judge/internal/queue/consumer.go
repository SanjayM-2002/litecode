package queue

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/SanjayM-2002/litecode/apps/judge/internal/model"
	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeName = "litecode"

	defaultQueue   = "judge.jobs.default"
	highRoutingKey = "judge.jobs.high"
)

type Handler func(ctx context.Context, jobID string) error

type Consumer struct {
	url      string
	queue    string
	prefetch int
	log      *slog.Logger
}

func New(url, queue string, prefetch int, log *slog.Logger) *Consumer {
	return &Consumer{url: url, queue: queue, prefetch: prefetch, log: log}
}

func (c *Consumer) Run(ctx context.Context, h Handler) error {
	backoff := time.Second
	for {
		err := c.session(ctx, h)
		if ctx.Err() != nil {
			return nil // clean shutdown
		}
		c.log.Error("amqp session ended, reconnecting", "err", err, "in", backoff)

		select {
		case <-ctx.Done():
			return nil
		case <-time.After(backoff):
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

func (c *Consumer) session(ctx context.Context, h Handler) error {
	conn, err := amqp.Dial(c.url)
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	if err := ch.ExchangeDeclare(ExchangeName, "topic", true, false, false, false, nil); err != nil {
		return err
	}
	if _, err := ch.QueueDeclare(c.queue, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(c.queue, c.queue, ExchangeName, false, nil); err != nil {
		return err
	}

	if c.queue == defaultQueue {
		if err := ch.QueueBind(c.queue, highRoutingKey, ExchangeName, false, nil); err != nil {
			return err
		}
		c.log.Debug("also bound high-priority key to the default queue",
			"key", highRoutingKey)
	}

	if err := ch.Qos(c.prefetch, 0, false); err != nil {
		return err
	}

	deliveries, err := ch.Consume(c.queue, "judge", false /* autoAck MUST be false */, false, false, false, nil)
	if err != nil {
		return err
	}

	c.log.Info("consuming", "queue", c.queue, "prefetch", c.prefetch)

	closed := conn.NotifyClose(make(chan *amqp.Error, 1))

	for {
		select {
		case <-ctx.Done():
			return nil
		case err := <-closed:
			return err
		case d, ok := <-deliveries:
			if !ok {
				return nil // channel closed; the outer loop reconnects
			}
			go c.handle(ctx, h, d)
		}
	}
}

func (c *Consumer) handle(ctx context.Context, h Handler, d amqp.Delivery) {
	var job model.Job
	if err := json.Unmarshal(d.Body, &job); err != nil {
		c.log.Error("malformed job payload, dropping", "err", err, "body", string(d.Body))
		_ = d.Nack(false, false)
		return
	}
	if job.JobID == "" {
		job.JobID = d.MessageId // backend-core sets messageId = submission id
	}

	log := c.log.With("job_id", job.JobID, "delivery_tag", d.DeliveryTag)
	log.Debug("delivery received", "redelivered", d.Redelivered)

	if err := h(ctx, job.JobID); err != nil {
		// If possible add quorum queues with x-delivery-limit plus the delayed-message plugin for real backoff.
		log.Error("grading failed, dead-lettering", "err", err)
		_ = d.Nack(false, false)
		return
	}

	if err := d.Ack(false); err != nil {

		log.Warn("ack failed; message will be redelivered", "err", err)
	}
}
