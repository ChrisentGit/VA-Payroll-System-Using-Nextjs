// Fills a dedicated demo database with made-up records. It wipes that database
// first, so it refuses to run on anything that could hold real data.
//
//   DEMO_MODE=true DATABASE_URL=postgresql://.../payroll_demo npm run seed:demo
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient, type Currency, type RateType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { encrypt } from "../lib/crypto";
import { DEMO_ADMIN_EMAIL, DEMO_CONTRACTOR_EMAIL, DEMO_EMAIL_DOMAIN } from "../lib/demo";
import { BCRYPT_ROUNDS } from "../lib/users";

const databaseUrl = process.env.DATABASE_URL ?? "";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const emailAt = (local: string) => `${local}@${DEMO_EMAIL_DOMAIN}`;
const DAY_MS = 24 * 60 * 60 * 1000;
const FX: Record<string, number> = { PHP: 1, USD: 58.25, AUD: 38.1 };
const round2 = (value: number) => Math.round(value * 100) / 100;

const now = new Date();
const monthStart = (offset: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
const monthEnd = (offset: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0));
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);
const utcMidnight = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const isWeekday = (date: Date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

function weekdaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    if (isWeekday(new Date(t))) days.push(new Date(t));
  }
  return days;
}

function lastWeekdays(count: number): Date[] {
  const days: Date[] = [];
  for (let back = 1; days.length < count; back += 1) {
    const day = utcMidnight(daysAgo(back));
    if (isWeekday(day)) days.push(day);
  }
  return days;
}

async function assertSafeTarget() {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error("Set DEMO_MODE=true to seed the demo database");
  }

  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!/demo/i.test(databaseName)) {
    throw new Error(`Refusing to wipe "${databaseName}": the database name must contain "demo"`);
  }

  const notDemo = { NOT: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } };
  const [users, contractors] = await Promise.all([
    prisma.user.count({ where: notDemo }),
    prisma.contractor.count({ where: notDemo }),
  ]);
  if (users > 0 || contractors > 0) {
    throw new Error("Refusing to wipe a database that holds non-demo accounts");
  }
}

async function wipe() {
  await prisma.timesheet.deleteMany();
  await prisma.payrollLineItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.rate.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.contractorPaymentDetail.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payrollSettings.deleteMany();
}

const PEOPLE = [
  { key: "maria", name: "Maria Santos", email: DEMO_CONTRACTOR_EMAIL, bank: "BDO Unibank", number: "005512348821" },
  { key: "jose", name: "Jose Reyes", email: emailAt("jose.reyes"), bank: "BPI", number: "309877124016" },
  { key: "ana", name: "Ana Dela Cruz", email: emailAt("ana.delacruz"), bank: "Metrobank", number: "221045567390" },
  { key: "paolo", name: "Paolo Garcia", email: emailAt("paolo.garcia"), bank: "UnionBank", number: "100298471155" },
  { key: "lea", name: "Lea Mendoza", email: emailAt("lea.mendoza"), bank: "Security Bank", number: "447120983362" },
] as const;

type PersonKey = (typeof PEOPLE)[number]["key"];

const paidToLabel = (key: PersonKey) => {
  const person = PEOPLE.find((p) => p.key === key)!;
  return `${person.bank} •••• ${person.number.slice(-4)}`;
};

interface EngagementPlan {
  key: string;
  person: PersonKey;
  client: "northwind" | "harbor" | "lumen";
  title: string;
  rateType: RateType;
  amount: number;
  currency: Currency;
  status?: string;
}

const ENGAGEMENTS: EngagementPlan[] = [
  { key: "maria-ea", person: "maria", client: "northwind", title: "Executive Assistant", rateType: "HOURLY", amount: 6.5, currency: "USD" },
  { key: "maria-social", person: "maria", client: "lumen", title: "Social Media Support", rateType: "RETAINER", amount: 18000, currency: "PHP" },
  { key: "jose-tc", person: "jose", client: "harbor", title: "Transaction Coordinator", rateType: "HOURLY", amount: 9, currency: "AUD" },
  { key: "ana-books", person: "ana", client: "lumen", title: "Bookkeeping", rateType: "RETAINER", amount: 650, currency: "USD" },
  { key: "paolo-web", person: "paolo", client: "northwind", title: "Website Rebuild", rateType: "PER_PROJECT", amount: 0, currency: "PHP" },
  { key: "lea-admin", person: "lea", client: "harbor", title: "Listing Admin", rateType: "RETAINER", amount: 22000, currency: "PHP", status: "paused" },
];

async function main() {
  await assertSafeTarget();
  await wipe();

  // Nobody signs in with this: demo sign-in has its own route, and password sign-in is off
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_ROUNDS);

  await prisma.user.create({
    data: { name: "Alex Rivera", email: DEMO_ADMIN_EMAIL, passwordHash, role: "SUPER_ADMIN" },
  });
  await prisma.user.create({
    data: { name: "Jamie Cruz", email: emailAt("jamie.cruz"), passwordHash, role: "FINANCE_OFFICER" },
  });
  await prisma.payrollSettings.create({ data: { payFrequency: "MONTHLY" } });

  const contractors = new Map<PersonKey, string>();
  for (const [index, person] of PEOPLE.entries()) {
    const user =
      person.key === "maria"
        ? await prisma.user.create({
            data: { name: person.name, email: person.email, passwordHash, role: "CONTRACTOR" },
          })
        : null;

    const contractor = await prisma.contractor.create({
      data: {
        name: person.name,
        email: person.email,
        phone: `+63 917 555 01${index}${index}`,
        taxId: encrypt(`000-555-00${index}-000`),
        status: person.key === "lea" ? "ON_LEAVE" : "ACTIVE",
        startDate: monthStart(-10),
        userId: user?.id,
        paymentDetails: {
          create: {
            method: "BANK_TRANSFER",
            accountName: person.name,
            accountNumber: encrypt(person.number),
            bankName: person.bank,
            isDefault: true,
          },
        },
      },
    });
    contractors.set(person.key, contractor.id);
  }

  const makeClient = (name: string, local: string, contactPerson: string, billingCurrency: Currency) =>
    prisma.client.create({ data: { name, email: emailAt(local), contactPerson, billingCurrency } });

  const clients = {
    northwind: await makeClient("Northwind Dental", "hello.northwind", "Dana Whitfield", "USD"),
    harbor: await makeClient("Harbor & Pine Realty", "hello.harborpine", "Tom Ashby", "AUD"),
    lumen: await makeClient("Lumen Studio", "hello.lumen", "Priya Nair", "USD"),
  };

  const engagements = new Map<string, EngagementPlan & { id: string }>();
  for (const plan of ENGAGEMENTS) {
    const engagement = await prisma.engagement.create({
      data: {
        contractorId: contractors.get(plan.person)!,
        clientId: clients[plan.client].id,
        title: plan.title,
        rateType: plan.rateType,
        projectPayMode: "MILESTONE",
        status: plan.status ?? "active",
        startDate: monthStart(-10),
        rates:
          plan.rateType === "PER_PROJECT"
            ? undefined
            : {
                create: { amount: plan.amount, currency: plan.currency, effectiveFrom: monthStart(-10) },
              },
      },
    });
    engagements.set(plan.key, { ...plan, id: engagement.id });
  }

  // Recent hours still moving through approval. Filled in first, so the
  // payroll months below leave these days alone.
  const hourly = ["maria-ea", "jose-tc"];
  const recentDays = lastWeekdays(6);
  const taken = new Set<string>();

  for (const key of hourly) {
    const plan = engagements.get(key)!;
    for (const [index, day] of recentDays.entries()) {
      taken.add(`${key}:${day.toISOString()}`);
      const status = index === 3 && key === "maria-ea" ? "REJECTED" : index < 3 ? "SUBMITTED" : "APPROVED";

      await prisma.timesheet.create({
        data: {
          engagementId: plan.id,
          contractorId: contractors.get(plan.person)!,
          date: day,
          hours: 8,
          description: "Inbox, calendar and client follow-ups",
          status,
          rejectionReason:
            status === "REJECTED" ? "Hours look high for this day. Please check and resubmit." : null,
        },
      });
    }
  }

  const milestones = [
    { offset: -3, title: "Design approved", amount: 25000 },
    { offset: -2, title: "Pages built", amount: 40000 },
    { offset: -1, title: "Site launched", amount: 35000 },
  ];

  const runs = [
    { offset: -3, finalized: true, paid: () => true, paidAt: daysAgo(38) },
    { offset: -2, finalized: true, paid: (key: PersonKey) => key === "maria" || key === "paolo", paidAt: daysAgo(9) },
    { offset: -1, finalized: false, paid: () => false, paidAt: null },
  ];

  let reference = 100234;

  for (const run of runs) {
    const start = monthStart(run.offset);
    const end = monthEnd(run.offset);
    const period = await prisma.payrollPeriod.create({
      data: { startDate: start, endDate: end, frequency: "MONTHLY" },
    });
    const payrollRun = await prisma.payrollRun.create({
      data: {
        payrollPeriodId: period.id,
        status: run.finalized ? "FINALIZED" : "DRAFT",
        generatedAt: new Date(end.getTime() + DAY_MS),
        finalizedAt: run.finalized ? new Date(end.getTime() + 2 * DAY_MS) : null,
        warnings: run.finalized
          ? []
          : ["Lea Mendoza is on leave, so the Listing Admin retainer was left out of this run."],
      },
    });

    for (const plan of engagements.values()) {
      if (plan.status === "paused") continue;

      const days =
        plan.rateType === "HOURLY"
          ? weekdaysBetween(start, end).filter((day) => !taken.has(`${plan.key}:${day.toISOString()}`))
          : [];
      const milestone = milestones.find((m) => m.offset === run.offset);

      let hours: number | null = null;
      let rateAmount = plan.amount;
      let totalAmount = plan.amount;
      let notes: string | null = null;
      let milestoneId: string | null = null;

      if (plan.rateType === "HOURLY") {
        if (days.length === 0) continue;
        hours = days.length * 8;
        totalAmount = round2(hours * plan.amount);
      } else if (plan.rateType === "PER_PROJECT") {
        if (!milestone) continue;
        const created = await prisma.milestone.create({
          data: {
            engagementId: plan.id,
            title: milestone.title,
            amount: milestone.amount,
            currency: plan.currency,
            completedAt: new Date(end.getTime() - 3 * DAY_MS),
          },
        });
        milestoneId = created.id;
        rateAmount = milestone.amount;
        totalAmount = milestone.amount;
        notes = `Milestone: ${milestone.title}`;
      }

      // The draft still waits for this month's foreign exchange rates
      const hasRate = run.finalized || plan.currency === "PHP";
      const isPaid = run.paid(plan.person);
      if (isPaid) reference += 7;

      const lineItem = await prisma.payrollLineItem.create({
        data: {
          payrollRunId: payrollRun.id,
          engagementId: plan.id,
          contractorId: contractors.get(plan.person)!,
          rateType: plan.rateType,
          hours,
          rateAmount,
          currency: plan.currency,
          totalAmount,
          exchangeRate: hasRate && plan.currency !== "PHP" ? FX[plan.currency] : null,
          totalAmountPhp: hasRate ? round2(totalAmount * FX[plan.currency]) : null,
          notes,
          milestoneId,
          paidAt: isPaid ? run.paidAt : null,
          paidBy: isPaid ? DEMO_ADMIN_EMAIL : null,
          paymentReference: isPaid ? `DEMO-${reference}` : null,
          paidTo: isPaid ? paidToLabel(plan.person) : null,
        },
      });

      if (days.length > 0) {
        await prisma.timesheet.createMany({
          data: days.map((date) => ({
            engagementId: plan.id,
            contractorId: contractors.get(plan.person)!,
            date,
            hours: 8,
            description: "Inbox, calendar and client follow-ups",
            status: "APPROVED" as const,
            approvedBy: DEMO_ADMIN_EMAIL,
            approvedAt: new Date(date.getTime() + DAY_MS),
            payrollLineItemId: lineItem.id,
          })),
        });
      }
    }
  }

  const adminEntry = (action: string, entityType: string, entityId: string, days: number, metadata = {}) => ({
    actorId: "demo-admin",
    actorEmail: DEMO_ADMIN_EMAIL,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: daysAgo(days),
  });

  await prisma.auditLog.createMany({
    data: [
      adminEntry("payroll.run_finalized", "PayrollRun", "demo-run-1", 9, { lineItems: 5 }),
      adminEntry("payroll.marked_paid", "PayrollRun", "demo-run-1", 9, { contractor: "Maria Santos" }),
      adminEntry("timesheet.approved", "Timesheet", "demo-timesheet-1", 4),
      adminEntry("timesheet.rejected", "Timesheet", "demo-timesheet-2", 3),
      adminEntry("engagement.updated", "Engagement", "demo-engagement-1", 2, { status: "paused" }),
    ],
  });

  console.log("Seeded the demo database");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
