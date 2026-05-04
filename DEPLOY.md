# RestaurantOS — Secure Deployment Guide

## ⚠️ CREDENTIAL ROTATION (MANDATORY)

Previous credentials were exposed during development. **You MUST rotate all of these before deploying:**

| Credential | Where to rotate |
|---|---|
| **Database password** | Supabase Dashboard → Settings → Database → Reset password |
| **Service Role Key** | Supabase Dashboard → Settings → API → Reset Service Role Key |
| **JWT_SECRET** | Regenerate with `openssl rand -base64 48` |
| **JWT_REFRESH_SECRET** | Regenerate with `openssl rand -base64 48` |
| **API_SECRET** | Regenerate with `openssl rand -base64 48` |

> After rotating in Supabase, update your local `.env` and Vercel environment variables.

---

## 1. Generate Secrets

Run these commands and save the output for your `.env` and Vercel:

```bash
# JWT & API secrets
openssl rand -base64 48    # → JWT_SECRET
openssl rand -base64 48    # → JWT_REFRESH_SECRET
openssl rand -base64 48    # → API_SECRET

# Seed passwords (use strong, unique passwords for each)
openssl rand -base64 16 | tr -d '/+=_'   # → SEED_SUPERADMIN_PASSWORD
openssl rand -base64 16 | tr -d '/+=_'   # → SEED_ADMIN_PASSWORD
openssl rand -base64 16 | tr -d '/+=_'   # → SEED_STAFF_PASSWORD
```

---

## 2. Configure Local `.env`

Copy the template and fill in your values:

```bash
cp .env.example .env
# Edit .env with your real Supabase credentials and generated secrets
```

### Supabase URL formats

| Variable | Port | Use case | Format |
|---|---|---|---|
| `DATABASE_URL` | 6543 | Runtime queries (pgbouncer) | `postgresql://postgres.[REF]:[PW]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | 5432 | Migrations only | `postgresql://postgres:[PW]@db.[REF].supabase.co:5432/postgres` |

> ⚠️ `DATABASE_URL` MUST use the pooler (port 6543) for Vercel serverless.
> ⚠️ `DIRECT_URL` MUST use the direct connection (port 5432) for migrations only.

---

## 3. Run Migrations

**Development** (creates a new migration):
```bash
npx prisma migrate dev --name your_migration_name
```

**Production / Vercel** (applies existing migrations):
```bash
npx prisma migrate deploy
```

> ⚠️ NEVER use `prisma db push` in production. Always use real migrations.

---

## 4. Run Seed (Manual, One-Time Only)

The seed requires environment variables. It will **abort with a clear error** if they are missing.

```bash
SEED_SUPERADMIN_PASSWORD="your-strong-password" \
SEED_ADMIN_PASSWORD="your-strong-password" \
SEED_STAFF_PASSWORD="your-strong-password" \
bunx tsx prisma/seed.ts
```

> All users are created with `mustChangePassword: true` — they must change their password on first login.
> Passwords are NEVER printed to the console.

---

## 5. Push to GitHub (No Secrets)

Before pushing, verify no secrets are committed:

```bash
# Check that .env is gitignored
git status --ignored | grep .env

# Check that no secrets are in tracked files
git ls-files | xargs grep -l "sb_secret\|SUPABASE_SERVICE_ROLE_KEY=.\{10\}" 2>/dev/null || echo "OK: No secrets in tracked files"

# Commit and push
git add .
git status   # Review carefully — ensure .env is NOT listed
git commit -m "feat: RestaurantOS production-ready"
git push origin main
```

---

## 6. Deploy to Vercel

### 6.1 Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add ALL of these:

```
DATABASE_URL            = postgresql://postgres.[REF]:[NEW_PW]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL              = postgresql://postgres:[NEW_PW]@db.[REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL = https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your-anon-key]
SUPABASE_SERVICE_ROLE_KEY = [your-new-service-role-key]
JWT_SECRET              = [generated-value]
JWT_REFRESH_SECRET      = [generated-value]
API_SECRET              = [generated-value]
```

> ⚠️ Do NOT add SEED_* variables to Vercel. The seed is only run manually, locally.

### 6.2 Build Configuration

Vercel will automatically run the `build` script from `package.json`:
```
"build": "prisma migrate deploy && prisma generate && next build"
```

This ensures:
1. `prisma migrate deploy` — applies pending migrations
2. `prisma generate` — generates the Prisma Client
3. `next build` — builds the Next.js app

### 6.3 Deploy

```bash
# Option A: Connect GitHub repo in Vercel Dashboard (recommended)
# Option B: Vercel CLI
vercel --prod
```

---

## 7. Post-Deploy: Run Seed

After the first successful deploy, run the seed **once** from your local machine
(pointing to the production database):

```bash
# Make sure your local .env has the PRODUCTION database URLs
SEED_SUPERADMIN_PASSWORD="your-strong-password" \
SEED_ADMIN_PASSWORD="your-strong-password" \
SEED_STAFF_PASSWORD="your-strong-password" \
bunx tsx prisma/seed.ts
```

> ⚠️ After seeding, log in as each user and change their password immediately.

---

## Security Checklist

- [ ] All Supabase credentials rotated (DB password, service role key)
- [ ] JWT_SECRET, JWT_REFRESH_SECRET, API_SECRET generated with `openssl rand -base64 48`
- [ ] `.env` is in `.gitignore` (not committed)
- [ ] `.env.example` has no real secrets — only empty placeholders
- [ ] No hardcoded passwords in `seed.ts` — all from env vars
- [ ] Seed passwords are strong (12+ characters) and unique per role
- [ ] All users created with `mustChangePassword: true`
- [ ] Vercel environment variables set correctly
- [ ] `SEED_*` variables NOT added to Vercel
- [ ] `prisma db push` NOT used in production — only `prisma migrate deploy`
- [ ] `DATABASE_URL` uses pooler (port 6543), `DIRECT_URL` uses direct (port 5432)
