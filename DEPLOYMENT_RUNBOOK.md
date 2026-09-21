# Production Deployment Runbook

This project runs as a Next.js App Router application on Zerops platform with a managed PostgreSQL database. This runbook documents the operator-controlled steps for deploying the application.

## 1. Prepare Production Services

Create these services before deploying:

- A pooled PostgreSQL database on Zerops (or external managed instance).
- A transactional email sender/domain for OTP delivery.
- AI provider credentials, with backup keys configured if needed.
- A Judge0 execution endpoint or an approved execution provider.
- Shared rate-limit storage before high public traffic.

Use a separate database for preview/staging deployments. Never point preview builds at the production database.

## 2. Configure Environment Variables

Set these variables for **Production** on Zerops or your deployment dashboard:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=<long-random-secret>
APP_URL=https://<production-domain>
NEXT_PUBLIC_APP_URL=https://<production-domain>
PRIMARY_AI_API_KEY=<primary-key>
PRIMARY_AI_API_KEY_2=<backup-key>
FREEMODEL_API_KEY=<freemodel-key>
FREEMODEL_BASE_URL=https://api.freemodel.dev/v1
RESEND_API_KEY=<sender-key>
RESEND_FROM_EMAIL=CodeRev <auth@yourdomain.com>
GOOGLE_CLIENT_ID=<optional-client-id>
GOOGLE_CLIENT_SECRET=<optional-client-secret>
GOOGLE_REDIRECT_URI=https://<production-domain>/api/auth/google/callback
```

Email OTP requires a Resend API key and a sender address on a Resend-verified domain. Before promoting, validate the secret shape and send a real operator-owned smoke email:

```bash
npm run verify:email
VERIFY_EMAIL_TO=operator@example.com npm run verify:email
```

Generate a session secret outside the repository, for example:

```bash
openssl rand -base64 48
```

Do not commit `.env`, `.env.local`, or generated provider keys.

## 3. Zerops Deployment Setup

The project includes a `zerops.yml` file configured for building and running Next.js on Zerops:

```yaml
zerops:
  - setup: app
    build:
      base: nodejs@20
      buildCommands:
        - npm ci
        - npx prisma generate
        - npm run build
      deployFiles:
        - .next
        - public
        - package.json
        - package-lock.json
        - next.config.js
        - prisma
    run:
      base: nodejs@20
      ports:
        - port: 3000
          http: true
      start: npm start
```

## 4. Apply Database Schema

1. Back up production and restore a copy into staging.
2. Apply the baseline/index changes to staging first with `npx prisma migrate deploy` or `npx prisma db push`.
3. Generate Prisma client during build (`npx prisma generate`).

## 5. Verify the Deployment

Replace the host with the production domain:

```bash
curl -i https://<production-domain>/api/health
curl -i https://<production-domain>/api/problems?page=1\&limit=3
curl -i https://<production-domain>/api/company
```

`/api/health` must return HTTP `200`, `status: "ok"`, database status `"ok"`, and email verification status `"configured"`.

## 6. Rollback

If the health probe or smoke tests fail:

1. Roll back to the previous deployment version.
2. Inspect runtime application logs.
3. Re-run `/api/health` and the smoke checklist.
