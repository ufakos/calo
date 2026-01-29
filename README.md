# SecureScope - Security Posture Assessment Platform

A comprehensive web application for conducting Black-Box / Public Surface Security Posture Assessments. Built with modern technologies and strict safety constraints.

## 🎯 Features

- **Attack Surface Mapping**: Discover public assets, subdomains, and exposed services
- **Security Observations**: Document findings with redacted evidence
- **Top 5 Risks**: Prioritized risk assessment with business impact
- **Action Plan**: Pre-onboarding + first 2 weeks remediation roadmap
- **Audit Controls**: Automated compliance checks with evidence
- **Report Generation**: Export assessments as Markdown, HTML, or JSON

## 🔒 Safety Constraints

This platform is designed for **safe, non-intrusive** assessments:

- ✅ **No brute force, credential stuffing, or fuzzing**
- ✅ **Rate limited**: Default 1 request/second, max 50 per tool run
- ✅ **Scope validation**: Only approved domains can be scanned
- ✅ **SSRF protection**: DNS resolution validates no internal IPs
- ✅ **Output redaction**: Auto-redacts emails, JWTs, API keys

## 🛠 Tech Stack

### Backend
- **NestJS** - API framework
- **PostgreSQL** - Primary database
- **Prisma** - ORM
- **Redis** - Queue and caching
- **BullMQ** - Background job processing
- **MinIO** - S3-compatible object storage

### Frontend
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **TanStack Query** - Data fetching

### Worker
- **BullMQ** - Job processing
- **Safe tools**: OpenSSL, curl, dig (read-only operations)

## 📦 Project Structure

```
calo/
├── packages/
│   ├── backend/         # NestJS API
│   ├── frontend/        # Next.js web app
│   ├── worker/          # BullMQ worker for tool execution
│   └── shared/          # Prisma schema, shared types
├── docker-compose.yml   # Docker orchestration
├── Makefile            # Development commands
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Running with Docker

1. **Clone and configure**
   ```bash
   cd /home/ubuntu01/calo
   cp .env.example .env
   # Edit .env with your settings
   ```

2. **Start all services**
   ```bash
   make up
   # or
   docker-compose up -d
   ```

3. **Initialize database**
   ```bash
   make db-push
   make db-seed
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - API Docs: http://localhost:4000/docs
   - MinIO Console: http://localhost:9001


## 🔧 Development

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   cd packages/backend && npm install
   cd ../frontend && npm install
   cd ../worker && npm install
   ```

2. **Start services (PostgreSQL, Redis, MinIO)**
   ```bash
   docker-compose up -d postgres redis minio
   ```

3. **Run database migrations**
   ```bash
   cd packages/shared
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

4. **Start backend**
   ```bash
   cd packages/backend
   npm run start:dev
   ```

5. **Start frontend**
   ```bash
   cd packages/frontend
   npm run dev
   ```

6. **Start worker**
   ```bash
   cd packages/worker
   npm run dev
   ```

## 🔐 Security Tools

The worker supports these safe, read-only tools:

| Tool | Description | Request Count |
|------|-------------|---------------|
| `TLS_CHECK` | TLS certificate and configuration analysis | 1 |
| `HEADER_CHECK` | HTTP response headers collection | 1 |
| `SECURITY_HEADERS` | Security header scoring | 1 |
| `CORS_CHECK` | CORS configuration testing | 3-4 |
| `DNS_LOOKUP` | DNS record enumeration | 6 |
| `CERT_TRANSPARENCY` | Subdomain discovery via CT logs | 1 |
| `TECH_FINGERPRINT` | Technology detection from headers | 1 |

## 📊 Database Schema

### Core Entities
- **User**: Platform users with RBAC (Admin, Analyst, Viewer)
- **Organization**: Target organizations with approved domains
- **Assessment**: Security assessment with status workflow

### Assessment Data
- **Asset**: Discovered public assets (domains, IPs, services)
- **Observation**: Security findings with evidence
- **Risk**: Prioritized risks with business impact
- **ActionItem**: Remediation tasks by phase
- **AuditControl**: Compliance checks with evidence

### Tool Execution
- **ToolRun**: Tool execution records with output references
- **Evidence**: Uploaded evidence files
- **Report**: Generated assessment reports

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `web` | 3000 | Next.js frontend |
| `api` | 4000 | NestJS backend |
| `worker` | - | BullMQ worker |
| `postgres` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis for queues |
| `minio` | 9000/9001 | Object storage |

## 📝 API Documentation

OpenAPI/Swagger docs available at `http://localhost:4000/docs`

### Key Endpoints

```
POST /auth/login              - Authenticate user
POST /auth/register           - Register new user

GET  /organizations           - List organizations
POST /organizations           - Create organization

GET  /assessments             - List assessments
POST /assessments             - Create assessment
GET  /assessments/:id         - Get assessment details

POST /tool-runs               - Queue tool execution
GET  /tool-runs               - List tool runs

POST /reports/generate        - Generate report
GET  /reports                 - List reports
```

## 🛡 Security Considerations

### Rate Limiting
- API: 100 requests/minute per user
- Tools: 1 request/second, max 50 per run
- Concurrent: Max 2 parallel requests per run

### Access Control
- JWT-based authentication
- Role-based access (Admin, Analyst, Viewer)
- Organization-scoped data access

### Data Protection
- Automatic redaction of sensitive data in outputs
- Evidence files stored encrypted in MinIO
- Audit logging for all actions

## 📄 License

Private - All rights reserved.

## 🤝 Contributing

This is an internal security tool. Contact the security team for access.
