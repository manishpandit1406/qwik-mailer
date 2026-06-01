import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import type {
  SendEmailJobData,
  WebhookDispatchJobData,
  AnalyticsIngestJobData,
} from "@qwikmailer/types";

// ─── Redis Connection ─────────────────────────────────────────────────────────

export function createRedisConnection() {
  return new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Limit retry flood — cap at 5s intervals, give up after 10 attempts
    retryStrategy: (times) => {
      if (times > 10) return null; // Stop retrying
      return Math.min(times * 500, 5000);
    },
  });
}

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  EMAIL_SEND: "email.send",
  EMAIL_BULK: "email.bulk",
  WEBHOOK_DISPATCH: "webhook.dispatch",
  ANALYTICS_INGEST: "analytics.ingest",
  WORKFLOW_RUNNER: "workflow.runner",
} as const;

// ─── Queue Factory ────────────────────────────────────────────────────────────

export function createEmailQueue(connection: IORedis) {
  return new Queue<SendEmailJobData>(QUEUE_NAMES.EMAIL_SEND, {
    connection: connection as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  });
}

export function createWebhookQueue(connection: IORedis) {
  return new Queue<WebhookDispatchJobData>(QUEUE_NAMES.WEBHOOK_DISPATCH, {
    connection: connection as any,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  });
}

export function createAnalyticsQueue(connection: IORedis) {
  return new Queue<AnalyticsIngestJobData>(QUEUE_NAMES.ANALYTICS_INGEST, {
    connection: connection as any,
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: { count: 2000 },
      removeOnFail: { count: 500 },
    },
  });
}

export function createWorkflowQueue(connection: IORedis) {
  return new Queue<any>(QUEUE_NAMES.WORKFLOW_RUNNER, {
    connection: connection as any,
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  });
}

// Re-export BullMQ primitives for worker usage
export { Queue, Worker, QueueEvents };
export type { SendEmailJobData, WebhookDispatchJobData, AnalyticsIngestJobData };
