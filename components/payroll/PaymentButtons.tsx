'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaymentButtons({
  runId,
  contractorId,
  isPaid,
}: {
  runId: string
  contractorId: string
  isPaid: boolean
}) {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)

  async function send(init: RequestInit, query = '') {
    setIsBusy(true)
    const response = await fetch(`/api/payroll-runs/${runId}/payments${query}`, init)

    if (response.ok) {
      router.refresh()
    } else {
      const data = await response.json()
      alert(data.error || 'Failed to save payment')
    }
    setIsBusy(false)
  }

  function markPaid() {
    const paymentReference = window.prompt('Payment reference (optional, e.g. bank or GCash ref no.)')
    if (paymentReference === null) return

    send({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractorId, paymentReference }),
    })
  }

  function undo() {
    if (window.confirm('Undo this payment record? The contractor will show as unpaid.')) {
      send({ method: 'DELETE' }, `?contractorId=${encodeURIComponent(contractorId)}`)
    }
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
