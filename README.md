# Bluemoso Payroll

A payroll system for companies that pay remote contractors. It takes hours from timesheet to payslip, converts foreign-currency pay to Philippine pesos, and records every change.

![Admin dashboard](docs/screenshots/dashboard.png)

| Payroll run | Contractor portal on a phone |
| --- | --- |
| ![A payroll run with payments](docs/screenshots/payroll-run.png) | ![Contractor overview on a phone](docs/screenshots/portal-phone.png) |

Screenshots use made-up data.

## What it does

**For the finance team**

- Keep contractors, clients and engagements in one directory, with a full rate history.
- Pay hourly, by monthly or per-period retainer, on project completion, or by milestone.
- Choose a monthly or twice-monthly pay schedule.
- Approve timesheets, or send them back with a reason.
- Run payroll in four steps: generate a draft, set exchange rates, finalize, and record payments.
- Export a finalized run as CSV.

**For contractors**

- Log hours from a phone and see whether they were approved or sent back.
- Read and print payslips.
- See where they get paid. Payment details are read-only here, so a stolen login cannot redirect anyone's pay.

**Security**

- Four roles, with permissions checked next to the data on every page and API route.
- Tax IDs and account numbers are encrypted with AES-256-GCM, and account numbers are masked on screen.
- Sign-in attempts are rate limited, and changing a password ends every other session.
- Temporary passwords must be changed at first sign-in.
- Every change and sign-in goes into an append-only audit log.
- A per-request Content-Security-Policy applies to every page.

## Built with

Next.js 16, React 19, TypeScript, PostgreSQL, Prisma 7, NextAuth v5, Tailwind CSS 4, Radix UI and Vitest.

## Run it locally

You need Node.js 20 or later and a PostgreSQL database.

```bash
npm install
cp .env.example .env
```

Fill in `.env`, then set up the database and start the app:

```bash
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open <http://localhost:3000> and sign in with the admin account you set in `.env`.

## Try the demo locally

Demo mode shows the app with made-up records, using a separate database. Create an empty database with `demo` in its name, then run these in bash:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bluemoso_demo"
export DEMO_MODE=true
npx prisma migrate deploy
npm run seed:demo
npm run dev
```

The sign-in page then offers one-click access as an admin or a contractor. To put a demo online, see [the deployment guide](docs/DEPLOYMENT.md#public-demo).

## Tests

```bash
npm test
npm run lint
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
