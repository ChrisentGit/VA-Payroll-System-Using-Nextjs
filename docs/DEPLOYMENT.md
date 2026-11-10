# Deployment

The app needs a Node.js host for Next.js and a PostgreSQL database. These steps use Vercel and a hosted PostgreSQL provider such as Neon, but any Node.js host works.

## 1. Create the database

Create a PostgreSQL database and copy its connection string. Most hosted providers need `?sslmode=require` at the end.

## 2. Generate secrets

Generate these once per environment and store them in a password manager.

These commands work in both bash and PowerShell.

```bash
npx auth secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The first prints `AUTH_SECRET`, and the second prints `ENCRYPTION_KEY`.

If `ENCRYPTION_KEY` is lost, saved tax IDs and account numbers cannot be recovered. To replace it, follow "Rotating the encryption key" below, because simply changing it makes existing values unreadable.

## 3. Set environment variables on the host

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Connection string from step 1 |
| `AUTH_SECRET` | From step 2 |
| `ENCRYPTION_KEY` | From step 2 |
| `AUTH_TRUST_HOST` | `true`, needed on hosts other than Vercel |

## 4. Apply migrations and create the first admin

Run these from your machine against the production database. Migrations are a separate step so that a build can never change the database by accident.

In bash:

```bash
DATABASE_URL="<production url>" npx prisma migrate deploy
DATABASE_URL="<production url>" SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="<strong password>" npx prisma db seed
```

In PowerShell, set the variables first. They last until you close the window.

```powershell
$env:DATABASE_URL = "<production url>"
$env:SEED_ADMIN_EMAIL = "you@example.com"
$env:SEED_ADMIN_PASSWORD = "<strong password>"
npx prisma migrate deploy
npx prisma db seed
```

Run `npx prisma migrate deploy` again whenever a release adds a migration, before that release goes live.

## 5. Deploy

Import the repository into Vercel. The default Next.js build works, and `postinstall` generates the Prisma client.

## 6. Check it works

1. Sign in as the admin and change the password under My Account.
2. Add a contractor with a tax ID, and confirm the database column starts with `enc:v1:`.
3. Create a test login under Users, sign in with it, and confirm it is sent to change its temporary password.

## Upgrading a database that already has data

After deploying the release that adds encryption, convert existing tax IDs and account numbers. It is safe to run more than once.

In bash:

```bash
DATABASE_URL="<production url>" ENCRYPTION_KEY="<key>" npx tsx scripts/encrypt-existing.ts
```

In PowerShell:

```powershell
$env:DATABASE_URL = "<production url>"
$env:ENCRYPTION_KEY = "<key>"
npx tsx scripts/encrypt-existing.ts
```

## Rotating the encryption key

Do this if the key may have been exposed, or on whatever schedule you choose. The app keeps working throughout, because it can read values under either key.

1. Generate a new key with the command in step 2.
2. On the host, set `ENCRYPTION_KEY` to the new key and `ENCRYPTION_KEY_PREVIOUS` to the old one, then redeploy.
3. From your machine, re-encrypt the saved values. It is safe to run more than once, and any failure leaves the database unchanged.

   In bash:

   ```bash
   DATABASE_URL="<production url>" ENCRYPTION_KEY="<new key>" ENCRYPTION_KEY_PREVIOUS="<old key>" npx tsx scripts/rotate-encryption-key.ts
   ```

   In PowerShell:

   ```powershell
   $env:DATABASE_URL = "<production url>"
   $env:ENCRYPTION_KEY = "<new key>"
   $env:ENCRYPTION_KEY_PREVIOUS = "<old key>"
   npx tsx scripts/rotate-encryption-key.ts
   ```

4. Remove `ENCRYPTION_KEY_PREVIOUS` from the host and redeploy.

## Public demo

A public demo is a second deployment with its own database, separate from the real one. Never point it at a database that holds real records.

With `DEMO_MODE=true`:

- The sign-in page offers one-click access as an admin or a contractor, and password sign-in is turned off.
- The API refuses every change, so visitors can look around but cannot save anything.
- Demo sign-in stops working if the database holds any account outside the `demo.bluemoso.example` domain.

To set one up:

1. Create a new PostgreSQL database with `demo` in its name. The seed script refuses any other name, because it wipes the database first.
2. Create a second deployment of the app. Give it this new `DATABASE_URL`, its own `AUTH_SECRET` and `ENCRYPTION_KEY`, and `DEMO_MODE` set to `true`.
3. From your machine, apply the migrations and load the made-up records.

   In bash:

   ```bash
   export DATABASE_URL="<demo database url>"
   export ENCRYPTION_KEY="<the demo key>"
   export DEMO_MODE=true
   npx prisma migrate deploy
   npm run seed:demo
   ```

   In PowerShell:

   ```powershell
   $env:DATABASE_URL = "<demo database url>"
   $env:ENCRYPTION_KEY = "<the demo key>"
   $env:DEMO_MODE = "true"
   npx prisma migrate deploy
   npm run seed:demo
   ```

Dates are relative to the day you seed, so run the last command again whenever the demo starts to look old.
