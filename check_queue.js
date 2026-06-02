const { Queue } = require("bullmq");
const IORedis = require("ioredis");

async function check() {
  const connection = new IORedis("redis://localhost:6379");
  const queue = new Queue("email.send", { connection });
  
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const delayed = await queue.getDelayedCount();
  const failed = await queue.getFailedCount();
  
  console.log({ waiting, active, delayed, failed });
  
  const jobs = await queue.getWaiting(0, 10);
  console.log("Waiting jobs:", jobs.map(j => j.id));
  process.exit(0);
}
check();
