import { JobType, QUEUE_NAME, redis } from "@repo/queue";
import { Worker } from "bullmq";
import { runGeneratePosts } from "./jobs/generate-posts";

const runners = {
  [JobType.GeneratePosts]: runGeneratePosts,
};

new Worker(
  QUEUE_NAME,
  async (job) => {
    const runner = runners[job.name as JobType];
    if (!runner) {
      console.error(`Unknown job type`, job.name);
      throw new Error(`Unknown job type ${job.name}`);
    }

    console.log(`[${job.id}] ${job.name} - Running...`, job.data);
    await runner(job.data);
    console.log(`[${job.id}] ${job.name} - Completed`);
  },
  { connection: redis },
);
