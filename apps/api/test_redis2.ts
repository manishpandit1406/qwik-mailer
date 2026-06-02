import { createRedisConnection, createEmailQueue } from "@qwikmailer/queue";

async function run() {
  const conn = createRedisConnection();
  const queue = createEmailQueue(conn);
  const delayed = await queue.getDelayed(0, 10);
  for (const job of delayed) {
    console.log("Job ID:", job.id);
    console.log("Job Data:", job.data);
    console.log("Job opts:", job.opts);
    console.log("Job Timestamp:", job.timestamp);
    console.log("Job Delay until:", job.timestamp + (job.opts.delay || 0));
    console.log("Job Attempts Made:", job.attemptsMade);
    console.log("Job Failed Reason:", job.failedReason);
  }
  process.exit(0);
}
run();
