// Package queue consumes grading jobs from RabbitMQ.
package queue

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/SanjayM-2002/litecode/apps/judge/internal/model"
	amqp "github.com/rabbitmq/amqp091-go"
)

// The shared contract with backend-core. These are re-declared in
// packages/queue/index.ts as JUDGE_EXCHANGE and JUDGE_ROUTING_KEYS — nothing
// enforces they match, and a mismatch means publishes succeed while the broker
// silently discards the message.
const (
	ExchangeName = "litecode"

	defaultQueue   = "judge.jobs.default"
	highRoutingKey = "judge.jobs.high"
)

// Handler grades one submission. Returning an error means INFRASTRUCTURE
// failure — the message must not be treated as done. User-code failures
// (compile error, TLE, wrong answer) are successful gradings and return nil.
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

// Run consumes until ctx is cancelled, reconnecting on failure.
//
// The reconnect loop is not optional: amqp091-go has NO automatic recovery.
// If the broker restarts — or a shared CloudAMQP instance is migrated — the
// consumer silently stops receiving messages with no error and nothing in the
// logs. It's the most common production bug with this library.
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

	// A topic exchange silently drops messages matching no binding. Until a
	// dedicated high-lane worker exists, the default queue also takes the
	// high-priority key so premium submissions aren't discarded without a trace.
	//
	// REMOVE THIS when you add a second worker bound to judge.jobs.high: an
	// exchange delivers to EVERY matching binding, so leaving both in place
	// would grade those submissions twice.
	if c.queue == defaultQueue {
		if err := ch.QueueBind(c.queue, highRoutingKey, ExchangeName, false, nil); err != nil {
			return err
		}
		c.log.Debug("also bound high-priority key to the default queue",
			"key", highRoutingKey)
	}

	// Prefetch caps unacked messages, so the BROKER enforces our sandbox
	// concurrency and at most `prefetch` handler goroutines ever exist.
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
		// Infrastructure failure. Do NOT requeue: classic queues have no
		// x-delivery-limit, so Nack(requeue=true) redelivers forever — a hot
		// loop that also burns the message quota.
		//
		// The submission stays RUNNING, and the sweeper re-enqueues it. That
		// is deliberately the whole retry story for now.
		//
		// TODO(retry): once on a self-hosted broker, add quorum queues with
		// x-delivery-limit plus the delayed-message plugin for real backoff.
		log.Error("grading failed, dead-lettering", "err", err)
		_ = d.Nack(false, false)
		return
	}

	// `false` = multiple:false. NEVER pass true here: with prefetch > 1 and a
	// goroutine per delivery, jobs finish out of order, and multiple:true acks
	// every tag up to this one — silently marking still-running jobs done. If
	// one of those crashes there is no redelivery and the submission hangs
	// forever. This only manifests under concurrency.
	if err := d.Ack(false); err != nil {
		// Harmless: without the ack the broker redelivers, we re-grade, and
		// the conditional UPDATE makes the second write a no-op.
		log.Warn("ack failed; message will be redelivered", "err", err)
	}
}
