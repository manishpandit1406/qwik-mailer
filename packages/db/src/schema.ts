import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";


// ─── Enums ───────────────────────────────────────────────────────────────────

export const userPlanEnum = pgEnum("user_plan", [
  "free",
  "event_level",
  "starter",
  "growth",
  "premium",
  "enterprise",
]);


export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
  "abuse_team",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "queued",
  "sending",
  "delivered",
  "deferred",
  "bounced",
  "complained",
  "failed",
]);

export const domainStatusEnum = pgEnum("domain_status", [
  "pending",
  "verified",
  "failed",
]);

export const emailEventTypeEnum = pgEnum("email_event_type", [
  "queued",
  "sent",
  "delivered",
  "bounced",
  "opened",
  "clicked",
  "unsubscribed",
  "complained",
  "deferred",
  "failed",
]);

export const webhookEventTypeEnum = pgEnum("webhook_event_type", [
  "delivered",
  "bounced",
  "opened",
  "clicked",
  "unsubscribed",
  "complained",
]);

export const workflowStatusEnum = pgEnum("workflow_status", ["active", "paused", "draft"]);
export const workflowRunStatusEnum = pgEnum("workflow_run_status", ["pending", "running", "completed", "failed", "cancelled"]);

export const contactMessageStatusEnum = pgEnum("contact_message_status", ["pending", "resolved"]);
export const newsletterSubscriberStatusEnum = pgEnum("newsletter_subscriber_status", ["active", "unsubscribed"]);
export const supportTicketStatusEnum = pgEnum("support_ticket_status", ["open", "in_progress", "resolved"]);


// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    passwordHash: text("password_hash").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpires: timestamp("email_verification_expires"),
    plan: userPlanEnum("plan").default("free").notNull(),
    role: userRoleEnum("role").default("user").notNull(),
    reputationScore: integer("reputation_score").default(100).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isSuspended: boolean("is_suspended").default(false).notNull(),
    suspendReason: text("suspend_reason"),
    monthlyEmailCount: integer("monthly_email_count").default(0).notNull(),
    billingPeriodStart: timestamp("billing_period_start").defaultNow().notNull(),
    dailyEmailCount: integer("daily_email_count").default(0).notNull(),
    dailyPeriodStart: timestamp("daily_period_start").defaultNow().notNull(),
    totpSecret: text("totp_secret"),
    totpEnabled: boolean("totp_enabled").default(false).notNull(),
    passwordResetToken: text("password_reset_token"),
    passwordResetExpires: timestamp("password_reset_expires"),
    companyName: varchar("company_name", { length: 255 }),
    websiteUrl: text("website_url"),
    phoneNumber: varchar("phone_number", { length: 50 }),
    useCase: varchar("use_case", { length: 100 }),
    onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_plan_idx").on(t.plan),
  ]
);

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 20 }).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").default(true).notNull(),
    ipAllowlist: text("ip_allowlist").array(), // e.g. ["192.168.1.1", "10.0.0.0/24"]
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("api_keys_user_idx").on(t.userId),
    index("api_keys_prefix_idx").on(t.keyPrefix),
  ]
);

// ─── IP Management ────────────────────────────────────────────────────────────

export const ipPools = pgTable(
  "ip_pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("ip_pools_user_idx").on(t.userId)]
);

export const dedicatedIps = pgTable(
  "dedicated_ips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipAddress: varchar("ip_address", { length: 45 }).notNull().unique(),
    poolId: uuid("pool_id").references(() => ipPools.id, { onDelete: "set null" }),
    domainId: uuid("domain_id"), // Optional assignment to specific domain
    isWarmupEnabled: boolean("is_warmup_enabled").default(false).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(), // active, warming, suspended
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("dedicated_ips_user_idx").on(t.userId),
    index("dedicated_ips_pool_idx").on(t.poolId),
  ]
);

// ─── Domains ──────────────────────────────────────────────────────────────────

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    status: domainStatusEnum("status").default("pending").notNull(),
    spfRecord: text("spf_record"),
    dkimPublicKey: text("dkim_public_key"),
    dkimPrivateKey: text("dkim_private_key"),
    dkimSelector: varchar("dkim_selector", { length: 50 }).default("qwikmailer"),
    dmarcRecord: text("dmarc_record"),
    spfVerified: boolean("spf_verified").default(false).notNull(),
    dkimVerified: boolean("dkim_verified").default(false).notNull(),
    dmarcVerified: boolean("dmarc_verified").default(false).notNull(),
    isTrackingDomain: boolean("is_tracking_domain").default(false).notNull(),
    trackingCname: varchar("tracking_cname", { length: 255 }),
    cnameVerified: boolean("cname_verified").default(false).notNull(),
    healthScore: integer("health_score").default(0),
    lastCheckedAt: timestamp("last_checked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("domains_user_domain_idx").on(t.userId, t.domain),
    index("domains_status_idx").on(t.status),
  ]
);

// ─── Domain Senders ───────────────────────────────────────────────────────────

export const domainSenders = pgTable(
  "domain_senders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    fromName: varchar("from_name", { length: 255 }),
    replyTo: varchar("reply_to", { length: 255 }),
    companyAddress: text("company_address"),
    companyAddress2: text("company_address_2"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    zipCode: varchar("zip_code", { length: 20 }),
    country: varchar("country", { length: 100 }),
    nickname: varchar("nickname", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("domain_senders_email_idx").on(t.email),
    index("domain_senders_domain_idx").on(t.domainId),
  ]
);

// ─── Inbound Parse ────────────────────────────────────────────────────────────

export const inboundParse = pgTable(
  "inbound_parse",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    subdomain: varchar("subdomain", { length: 255 }).notNull(),
    destinationUrl: text("destination_url").notNull(),
    spamCheck: boolean("spam_check").default(false).notNull(),
    sendRaw: boolean("send_raw").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("inbound_parse_user_idx").on(t.userId),
    uniqueIndex("inbound_parse_domain_idx").on(t.domainId),
    uniqueIndex("inbound_parse_subdomain_idx").on(t.subdomain),
  ]
);

// ─── Certificates ─────────────────────────────────────────────────────────────

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull().default("certificate"), // certificate|invoice|hall_ticket|offer_letter|id_card|report
    fileUrl: varchar("file_url", { length: 1024 }).notNull(), // path to the uploaded base PDF
    config: jsonb("config").notNull(), // array of fields { name, x, y, fontSize, color, font }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("certificates_user_idx").on(t.userId)]
);

// ─── Contact Lists ────────────────────────────────────────────────────────────

export const contactLists = pgTable(
  "contact_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 1024 }).notNull(), // path to the uploaded file
    totalRows: integer("total_rows").default(0).notNull(),
    validEmails: integer("valid_emails").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("contact_lists_user_idx").on(t.userId)]
);

// ─── Emails ───────────────────────────────────────────────────────────────────

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: varchar("batch_id", { length: 50 }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id").references(() => domains.id),
    messageId: text("message_id").unique(),
    fromEmail: varchar("from_email", { length: 255 }).notNull(),
    fromName: varchar("from_name", { length: 255 }),
    toEmail: varchar("to_email", { length: 255 }).notNull(),
    toName: varchar("to_name", { length: 255 }),
    replyTo: varchar("reply_to", { length: 255 }),
    subject: text("subject").notNull(),
    htmlBody: text("html_body"),
    textBody: text("text_body"),
    status: emailStatusEnum("status").default("queued").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    metadata: jsonb("metadata").$type<Record<string, string>>().default({}),
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    bouncedAt: timestamp("bounced_at"),
    bounceReason: text("bounce_reason"),
    openCount: integer("open_count").default(0).notNull(),
    clickCount: integer("click_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("emails_user_idx").on(t.userId),
    index("emails_status_idx").on(t.status),
    index("emails_created_at_idx").on(t.createdAt),
    index("emails_to_email_idx").on(t.toEmail),
  ]
);

// ─── Email Events ─────────────────────────────────────────────────────────────

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailId: uuid("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: emailEventTypeEnum("type").notNull(),
    ip: varchar("ip", { length: 45 }),
    userAgent: text("user_agent"),
    country: varchar("country", { length: 2 }),
    city: varchar("city", { length: 100 }),
    url: text("url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (t) => [
    index("email_events_email_idx").on(t.emailId),
    index("email_events_user_idx").on(t.userId),
    index("email_events_type_idx").on(t.type),
    index("email_events_occurred_at_idx").on(t.occurredAt),
  ]
);

// ─── Templates ────────────────────────────────────────────────────────────────

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    subject: text("subject").notNull(),
    htmlBody: text("html_body").notNull(),
    textBody: text("text_body"),
    variables: jsonb("variables").$type<string[]>().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("templates_user_idx").on(t.userId)]
);

// ─── Reputation Logs ──────────────────────────────────────────────────────────

export const reputationLogs = pgTable(
  "reputation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("reputation_logs_user_idx").on(t.userId),
    index("reputation_logs_created_at_idx").on(t.createdAt),
  ]
);

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: jsonb("events").$type<string[]>().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    lastFiredAt: timestamp("last_fired_at"),
    failureCount: integer("failure_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("webhooks_user_idx").on(t.userId)]
);

// ─── Webhook Logs ─────────────────────────────────────────────────────────────

export const webhookLogs = pgTable(
  "webhook_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("webhook_logs_webhook_idx").on(t.webhookId)]
);

// ─── Suppression List ─────────────────────────────────────────────────────────

export const suppressionList = pgTable(
  "suppression_list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull().default("unsubscribe"), // bounce, spam_report, unsubscribe, invalid
    reason: text("reason"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("suppression_user_email_idx").on(t.userId, t.email),
    index("suppression_user_type_idx").on(t.userId, t.type),
  ]
);

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("refresh_tokens_user_idx").on(t.userId)]
);

// ─── Workflows ───────────────────────────────────────────────────────────────

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: workflowStatusEnum("status").default("active").notNull(),
    trigger: jsonb("trigger").notNull(), // { type, config }
    steps: jsonb("steps").notNull(), // array of step objects
    totalRuns: integer("total_runs").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("workflows_user_idx").on(t.userId)]
);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    emailId: uuid("email_id").references(() => emails.id),
    status: workflowRunStatusEnum("status").default("pending").notNull(),
    currentStepId: text("current_step_id"),
    context: jsonb("context").$type<Record<string, unknown>>().default({}), // recipient data
    logs: jsonb("logs").$type<Array<{ step: string; time: string; status: string; message?: string }>>().default([]),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index("workflow_runs_workflow_idx").on(t.workflowId),
    index("workflow_runs_status_idx").on(t.status),
  ]
);

// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("teams_owner_idx").on(t.ownerId),
    uniqueIndex("teams_slug_idx").on(t.slug),
  ]
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    index("team_members_team_idx").on(t.teamId),
    index("team_members_user_idx").on(t.userId),
    uniqueIndex("team_members_team_user_idx").on(t.teamId, t.userId),
  ]
);

export const teamInvites = pgTable(
  "team_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("member"),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("team_invites_team_idx").on(t.teamId),
    uniqueIndex("team_invites_token_idx").on(t.token),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  domains: many(domains),
  emails: many(emails),
  templates: many(templates),
  webhooks: many(webhooks),
  refreshTokens: many(refreshTokens),
  reputationLogs: many(reputationLogs),
  domainSenders: many(domainSenders),
  certificates: many(certificates),
  workflows: many(workflows),
  teams: many(teams),
  teamMembers: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
  members: many(teamMembers),
  invites: many(teamInvites),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const teamInvitesRelations = relations(teamInvites, ({ one }) => ({
  team: one(teams, { fields: [teamInvites.teamId], references: [teams.id] }),
  invitedBy: one(users, { fields: [teamInvites.invitedBy], references: [users.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  user: one(users, {
    fields: [webhooks.userId],
    references: [users.id],
  }),
  logs: many(webhookLogs),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookLogs.webhookId],
    references: [webhooks.id],
  }),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  user: one(users, { fields: [emails.userId], references: [users.id] }),
  domain: one(domains, { fields: [emails.domainId], references: [domains.id] }),
  events: many(emailEvents),
}));

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  email: one(emails, { fields: [emailEvents.emailId], references: [emails.id] }),
  user: one(users, { fields: [emailEvents.userId], references: [users.id] }),
}));

export const domainsRelations = relations(domains, ({ one, many }) => ({
  user: one(users, { fields: [domains.userId], references: [users.id] }),
  emails: many(emails),
  senders: many(domainSenders),
}));

export const domainSendersRelations = relations(domainSenders, ({ one }) => ({
  user: one(users, { fields: [domainSenders.userId], references: [users.id] }),
  domain: one(domains, { fields: [domainSenders.domainId], references: [domains.id] }),
}));

export const reputationLogsRelations = relations(reputationLogs, ({ one }) => ({
  user: one(users, { fields: [reputationLogs.userId], references: [users.id] }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, { fields: [certificates.userId], references: [users.id] }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, { fields: [workflows.userId], references: [users.id] }),
  runs: many(workflowRuns),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowRuns.workflowId], references: [workflows.id] }),
  email: one(emails, { fields: [workflowRuns.emailId], references: [emails.id] }),
}));

// ─── Marketing ───────────────────────────────────────────────────────────────

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: contactMessageStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    status: newsletterSubscriberStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ─── Support Tickets ──────────────────────────────────────────────────────────

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: supportTicketStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
}));

