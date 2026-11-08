import type { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import {
  calculateHourly,
  calculateMilestones,
  calculateRetainer,
  type DraftLineItem,
} from '@/lib/payroll/calculate'

// An expected failure with a message that is safe to show the user.
export class PayrollError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

const label = (e: { contractor: { name: string }; client: { name: string } }) =>
  `${e.contractor.name} (${e.client.name})`

const names = {
  contractor: { select: { name: true } },
  client: { select: { name: true } },
}

// Builds a draft run in one transaction, so a failure leaves nothing behind.
export async function generateRun(periodId: string, session: Session) {
  return prisma.$transaction(
    async (tx) => {
      const period = await tx.payrollPeriod.findUnique({
        where: { id: periodId },
        include: { runs: { select: { id: true } } },
      })

      if (!period) throw new PayrollError('Payroll period not found', 404)
      if (period.runs.length > 0) {
        throw new PayrollError(
          'This period already has a payroll run. Delete the draft to generate it again.',
          409
        )
      }

      const items: DraftLineItem[] = []
      const warnings: string[] = []
      const collect = (result: { items: DraftLineItem[]; warnings: string[] }) => {
        items.push(...result.items)
        warnings.push(...result.warnings)
      }

      // Hourly: every approved, unpaid timesheet up to the end of the period.
      // Earlier dates are included so a late approval still gets paid.
      const hourly = await tx.engagement.findMany({
        where: { rateType: 'HOURLY' },
        include: {
          ...names,
          rates: true,
          timesheets: {
            where: {
              status: 'APPROVED',
              payrollLineItemId: null,
              date: { lte: period.endDate },
            },
            orderBy: { date: 'asc' },
          },
        },
      })

      for (const engagement of hourly) {
        collect(
          calculateHourly(
            { ...engagement, label: label(engagement) },
            engagement.rates,
            engagement.timesheets,
            period
          )
        )
      }

      // Retainers: paid by the days they cover within the period.
      const retainers = await tx.engagement.findMany({
        where: {
          rateType: 'RETAINER',
          startDate: { lte: period.endDate },
          OR: [{ endDate: null }, { endDate: { gte: period.startDate } }],
        },
        include: { ...names, rates: true },
      })

      for (const engagement of retainers) {
        if (engagement.status === 'paused') {
          warnings.push(`${label(engagement)}: engagement is paused, so no retainer was paid.`)
          continue
        }
        if (engagement.status === 'ended' && !engagement.endDate) {
          warnings.push(
            `${label(engagement)}: engagement is ended but has no end date, so no retainer was paid.`
          )
          continue
        }
        collect(
          calculateRetainer({ ...engagement, label: label(engagement) }, engagement.rates, period)
        )
      }

      // Per project: only finished work that has not been paid yet.
      const projects = await tx.engagement.findMany({
        where: { rateType: 'PER_PROJECT' },
        include: {
          ...names,
          milestones: {
            where: { completedAt: { lte: period.endDate }, lineItem: { is: null } },
            orderBy: { completedAt: 'asc' },
          },
        },
      })

      for (const engagement of projects) {
        collect(calculateMilestones({ ...engagement, label: label(engagement) }, engagement.milestones))
      }

      const waiting = await tx.timesheet.count({
        where: { status: 'SUBMITTED', date: { lte: period.endDate } },
      })
      if (waiting > 0) {
        warnings.push(
          `${waiting} timesheet(s) are still waiting for approval and are not in this run.`
        )
      }

      const run = await tx.payrollRun.create({
        data: { payrollPeriodId: period.id, warnings },
      })

      for (const { timesheetIds, ...item } of items) {
        const isPhp = item.currency === 'PHP'
        const lineItem = await tx.payrollLineItem.create({
          data: {
            ...item,
            payrollRunId: run.id,
            exchangeRate: isPhp ? 1 : null,
            totalAmountPhp: isPhp ? item.totalAmount : null,
          },
        })

        if (timesheetIds.length > 0) {
          await tx.timesheet.updateMany({
            where: { id: { in: timesheetIds } },
            data: { payrollLineItemId: lineItem.id },
          })
        }
      }

      await recordAudit(tx, session, {
        action: 'payroll.run_generated',
        entityType: 'PayrollRun',
        entityId: run.id,
        metadata: { periodId: period.id, lineItems: items.length, warnings: warnings.length },
      })

      return tx.payrollRun.findUniqueOrThrow({
        where: { id: run.id },
        include: {
          lineItems: { include: { contractor: true, engagement: { include: { client: true } } } },
        },
      })
    },
    { timeout: 20_000 }
  )
}
