import { createRedisConnection, createEmailQueue } from "@qwikmailer/queue";

async function run() {
  const conn = createRedisConnection();
  const queue = createEmailQueue(conn);
  const counts = await queue.getJobCounts();
  console.log(counts);
  process.exit(0);
}
run();
