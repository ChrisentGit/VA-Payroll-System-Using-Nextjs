'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useFeedback } from '@/components/ui/feedback'
import { sendRequest } from '@/lib/client-request'

export default function PaymentButtons({
  runId,
  contractorId,
  contractorName,
  isPaid,
}: {
  runId: string
  contractorId: string
  contractorName: string
  isPaid: boolean
}) {
  const router = useRouter()
  const { ask, confirm, toast } = useFeedback()
  const [isBusy, setIsBusy] = useState(false)

  async function send(
    options: { method: string; body?: object },
    successMessage: string,
    query = ''
  ) {
    setIsBusy(true)
    const result = await sendRequest(`/api/payroll-runs/${runId}/payments${query}`, {
      ...options,
      fallbackError: 'Failed to save payment',
    })

    if (result.ok) {
      toast(successMessage)
      router.refresh()
    } else {
      toast(result.error, 'error')
    }
    setIsBusy(false)
  }

  async function markPaid() {
    const paymentReference = await ask({
      title: `Mark ${contractorName} as paid?`,
      description: 'Their payslip will show the payment and the account it went to.',
      label: 'Payment reference (optional)',
      placeholder: 'Bank or GCash reference number',
      confirmLabel: 'Mark Paid',
    })
    if (paymentReference === null) return

    await send({ method: 'POST', body: { contractorId, paymentReference } }, 'Payment recorded')
  }

  async function undo() {
    const confirmed = await confirm({
      title: 'Undo this payment record?',
      description: `${contractorName} will show as unpaid.`,
      confirmLabel: 'Undo Payment',
      danger: true,
    })
    if (!confirmed) return

    await send(
      { method: 'DELETE' },
      'Payment record removed',
      `?contractorId=${encodeURIComponent(contractorId)}`
    )
  }

  return isPaid ? (
    <Button variant="outline" size="sm" onClick={undo} disabled={isBusy}>
      Undo
    </Button>
  ) : (
    <Button size="sm" onClick={markPaid} disabled={isBusy}>
      {isBusy ? 'Saving...' : 'Mark Paid'}
    </Button>
  )
}
