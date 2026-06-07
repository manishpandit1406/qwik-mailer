// ─── User & Auth Types ────────────────────────────────────────────────────────

export type UserPlan = "free" | "starter" | "growth" | "enterprise";
export type UserRole = "user" | "admin" | "abuse_team";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  plan: UserPlan;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Email Types ──────────────────────────────────────────────────────────────

export type EmailStatus =
  | "queued"
  | "sending"
  | "delivered"
  | "deferred"
  | "bounced"
  | "complained"
  | "failed";

export type EmailEventType =
  | "delivered"
  | "bounced"
  | "opened"
  | "clicked"
  | "unsubscribed"
  | "complained"
  | "deferred"
  | "failed";

export interface SendEmailPayload {
  to: string | { email: string; name?: string } | Array<{ email: string; name?: string }>;
  from?: string;
  fromName?: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  variables?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, string>;
  scheduledAt?: string; // ISO date string
  replyTo?: string;
}

export interface BulkSendPayload {
  emails: SendEmailPayload[];
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type DomainStatus = "pending" | "verified" | "failed";

export interface DnsRecord {
  type: "TXT" | "CNAME" | "MX";
  host: string;
  value: string;
  verified: boolean;
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  complained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  period: "24h" | "7d" | "30d" | "90d";
}

export interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Webhook Types ────────────────────────────────────────────────────────────

export type WebhookEvent =
  | "delivered"
  | "bounced"
  | "opened"
  | "clicked"
  | "unsubscribed"
  | "complained";

export interface WebhookPayload {
  event: WebhookEvent;
  emailId: string;
  to: string;
  subject: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Queue Job Types ──────────────────────────────────────────────────────────

export interface SendEmailJobData {
  emailId: string;
  teamId: string;
}

export interface WebhookDispatchJobData {
  webhookId: string;
  teamId: string;
  payload: WebhookPayload;
}

export interface AnalyticsIngestJobData {
  emailId: string;
  teamId: string;
  type: EmailEventType;
  ip?: string;
  userAgent?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowRunnerJobData {
  workflowRunId: string;
  workflowId: string;
  teamId: string;
}

// ─── Reputation Types ─────────────────────────────────────────────────────────

export interface ReputationLog {
  id: string;
  teamId: string;
  points: number;
  reason: string;
  createdAt: string;
}
