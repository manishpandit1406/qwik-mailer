# Qwik Mailer — AI-Native Email Delivery Platform

<p align="center">
  <strong>Developer-first email infrastructure with AI-powered deliverability, anti-abuse protection, and real-time analytics.</strong>
</p>

---

## ✨ Features

| Feature | Status |
|---|---|
| REST API (send, bulk-send, logs, analytics) | ✅ MVP |
| SMTP credentials support | ✅ MVP |
| Dashboard (dark-mode, glassmorphism UI) | ✅ MVP |
| Domain verification (SPF, DKIM, DMARC) | ✅ MVP |
| Email templates with variable support | ✅ MVP |
| API key management | ✅ MVP |
| Webhooks (delivered, bounced, opened, etc.) | ✅ MVP |
| Real-time analytics with charts | ✅ MVP |
| Queue-based email processing (BullMQ) | ✅ MVP |
| Anti-abuse: reputation scoring, suppression list | ✅ MVP |
| 2FA (TOTP) | ✅ MVP |
| AI spam checker | 🚧 Phase 2 |
| Dedicated IP warmup | 🚧 Phase 2 |
| SMS / WhatsApp API | 🔮 Future |

---

## 🏗️ Project Structure

```
qwikmailer/
├── apps/
│   ├── api/              # Fastify REST API + Mail Worker
│   └── web/              # Next.js 14 Dashboard
├── packages/
│   ├── db/               # Drizzle ORM + PostgreSQL schemas
│   ├── queue/            # BullMQ job definitions
│   └── types/            # Shared TypeScript types
├── docker-compose.yml    # PostgreSQL + Redis + Maildev
├── .env.example          # Environment variable template
└── turbo.json
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20.x |
| pnpm | ≥ 9.x |
| Docker | ≥ 24.x |

### 1. Install Node.js (if not installed)

```bash
# Using NVM (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc
nvm install 20
nvm use 20
```

### 2. Install pnpm

```bash
npm install -g pnpm
```

### 3. Clone & Install Dependencies

```bash
cd "Qwik Mailer"   # or wherever this project is
cp .env.example .env
pnpm install
```

### 4. Start Infrastructure (PostgreSQL + Redis + Maildev)

```bash
docker-compose up -d
```

Services started:
- **PostgreSQL** → `localhost:5432`
- **Redis** → `localhost:6379`
- **Maildev** (SMTP capture) → `localhost:1025` / UI at `localhost:1080`

### 5. Run Database Migrations

```bash
pnpm --filter @qwikmailer/db db:push
```

### 6. Start All Services

```bash
# Start everything (API + Web dashboard)
pnpm dev
```

Or start individually:

```bash
# API server (port 4000)
pnpm --filter @qwikmailer/api dev

# Mail worker (queue processor)
pnpm --filter @qwikmailer/api worker

# Web dashboard (port 3000)
pnpm --filter @qwikmailer/web dev
```

### 7. Open the App

| Service | URL |
|---|---|
| 🌐 Dashboard | http://localhost:3000 |
| 📮 API | http://localhost:4000 |
| 🔍 API Health | http://localhost:4000/health |
| 📬 Maildev (catch emails) | http://localhost:1080 |

---

## 📡 API Reference

### Authentication

All API endpoints (except auth) require either:
- **Bearer token**: `Authorization: Bearer <jwt>`
- **API key**: `X-API-Key: mf_live_<key>`

### Send Email

```bash
curl -X POST http://localhost:4000/v1/send \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Hello from Qwik Mailer!",
    "html": "<h1>Hello {{name}}!</h1>",
    "variables": { "name": "Priya" }
  }'
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/auth/register` | Create account |
| `POST` | `/v1/auth/login` | Login + get JWT |
| `POST` | `/v1/auth/refresh` | Refresh access token |
| `GET`  | `/v1/auth/me` | Get current user |
| `POST` | `/v1/send` | Send single email |
| `POST` | `/v1/bulk-send` | Send up to 1000 emails |
| `GET`  | `/v1/logs` | Email delivery logs |
| `GET`  | `/v1/analytics` | Summary analytics |
| `GET`  | `/v1/analytics/daily` | Daily breakdown |
| `POST` | `/v1/domains` | Add sending domain |
| `GET`  | `/v1/domains/:id/dns-records` | Get DNS records |
| `POST` | `/v1/domains/:id/verify` | Verify DNS records |
| `POST` | `/v1/api-keys` | Create API key |
| `GET`  | `/v1/api-keys` | List API keys |
| `DELETE` | `/v1/api-keys/:id` | Revoke API key |
| `POST` | `/v1/templates` | Create template |
| `GET`  | `/v1/templates` | List templates |
| `POST` | `/v1/webhooks` | Register webhook |
| `GET`  | `/v1/webhooks` | List webhooks |

---

## 🏛️ Architecture

```
Client (Browser)
    │
    ▼
Next.js Frontend (port 3000)
    │ REST calls
    ▼
Fastify API (port 4000)
    │
    ├── JWT / API Key Auth
    ├── Rate Limiting (Redis)
    │
    ▼
BullMQ Queues (Redis)
    │
    ▼
Mail Worker
    │
    ├── Nodemailer → SMTP (Maildev local / Postfix prod)
    ├── Bounce detection → Suppression list
    ├── Reputation scoring
    └── Webhook dispatch
    
PostgreSQL ← Drizzle ORM ← All services
```

---

## 🗄️ Database Schema

| Table | Description |
|---|---|
| `users` | Auth, plan, reputation score |
| `api_keys` | Hashed keys per user |
| `domains` | Sending domains + verification |
| `emails` | All sent emails + status |
| `email_events` | Opens, clicks, bounces |
| `templates` | HTML templates with variables |
| `webhooks` | Registered webhook endpoints |
| `suppression_list` | Global bounce/complaint list |
| `refresh_tokens` | JWT refresh token store |

---

## 🛡️ Anti-Abuse

Qwik Mailer includes multiple layers of protection:

1. **Disposable email blocklist** — Rejects signups from temp email domains
2. **Reputation scoring** — Each account starts at 100; drops on bounces
3. **Auto-suppression** — Bounced addresses added to global suppression list
4. **Auto-suspend** — Accounts with reputation < 20 are suspended
5. **Webhook auto-disable** — Endpoints with 10+ failures are disabled

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Fastify, TypeScript, Zod |
| ORM | Drizzle ORM |
| Queue | BullMQ |
| Database | PostgreSQL |
| Cache / Queue Broker | Redis |
| Mail (dev) | Nodemailer + Maildev |
| Monorepo | Turborepo + pnpm workspaces |

---

## 🌍 Deployment

### Environment Variables

Copy `.env.example` to `.env` and fill in production values:

```bash
cp .env.example .env
```

Key variables to configure:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Long random string (≥ 32 chars)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — Your SMTP provider

### Production SMTP Options

| Provider | Notes |
|---|---|
| Postfix (self-hosted) | Full control, requires IP warmup |
| Amazon SES | Cheap at scale, good deliverability |
| SMTP2GO | Easy setup, free tier available |
| Mailgun | Developer-friendly API |

---

## 📋 Roadmap

- [ ] AI spam score checker (subject line analysis)
- [ ] Dedicated IP warmup assistant
- [ ] AI email generator (prompt → HTML)
- [ ] Drag-and-drop template editor
- [ ] SMS API (Twilio integration)
- [ ] Billing integration (Razorpay / Stripe)
- [ ] ClickHouse for high-volume analytics
- [ ] Multi-tenant organization support

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ for the developer community.</p>
