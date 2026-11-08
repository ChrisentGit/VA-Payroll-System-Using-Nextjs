# Deployment

The app needs a Node.js host for Next.js and a PostgreSQL database. These steps use Vercel and a hosted PostgreSQL provider such as Neon, but any Node.js host works.

## 1. Create the database

Create a PostgreSQL database and copy its connection string. Most hosted providers need `?sslmode=require` at the end.

## 2. Generate secrets

Generate these once per environment and store them in a password manager.

```bash
npx auth secret                # AUTH_SECRET
openssl rand -base64 32        # ENCRYPTION_KEY
```

If `ENCRYPTION_KEY` is lost, saved tax IDs and account numbers cannot be recovered. Changing it makes existing values unreadable.

## 3. Set environment variables on the host

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Connection string from step 1 |
| `AUTH_SECRET` | From step 2 |
| `ENCRYPTION_KEY` | From step 2 |
| `AUTH_TRUST_HOST` | `true`, needed on hosts other than Vercel |

## 4. Apply migrations and create the first admin

Run these from your machine against the production database. Migrations are a separate step so that a build can never change the database by accident.

```bash
DATABASE_URL="<production url>" npx prisma migrate deploy
DATABASE_URL="<production url>" SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="<strong password>" npx prisma db seed
```

Run `npx prisma migrate deploy` again whenever a release adds a migration, before that release goes live.

## 5. Deploy

Import the repository into Vercel. The default Next.js build works, and `postinstall` generates the Prisma client.

## 6. Check it works

1. Sign in as the admin and change the password under My Account.
2. Add a contractor with a tax ID, and confirm the database column starts with `enc:v1:`.
3. Create a test login under Users and confirm it can sign in.

## Upgrading a database that already has data

After deploying the release that adds encryption, convert existing tax IDs and account numbers. It is safe to run more than once.

```bash
DATABASE_URL="<production url>" ENCRYPTION_KEY="<key>" npx tsx scripts/encrypt-existing.ts
```
