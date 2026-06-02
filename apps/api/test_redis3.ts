import { createRedisConnection, createEmailQueue } from "@qwikmailer/queue";

async function run() {
  const conn = createRedisConnection();
  const queue = createEmailQueue(conn);
  
  const jobs = await queue.getJobs(['active', 'waiting', 'delayed', 'failed']);
  for (const job of jobs) {
    if (job.data.emailId === 'a7675131-54d2-4fbd-a631-1b836ecf2a54') {
      console.log("Found Job:", job.id);
      console.log("State:", await job.getState());
      console.log("FailedReason:", job.failedReason);
      console.log("Attempts:", job.attemptsMade);
    }
  }
  process.exit(0);
}
run();
