'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useFeedback } from '@/components/ui/feedback'
import { sendRequest } from '@/lib/client-request'

export default function FinalizeRunButton({ runId }: { runId: string }) {
  const router = useRouter()
  const { confirm, toast } = useFeedback()
  const [isFinalizing, setIsFinalizing] = useState(false)

  async function handleFinalize() {
    const confirmed = await confirm({
      title: 'Finalize this payroll run?',
      description: 'This locks the run and its exchange rates from further changes.',
      confirmLabel: 'Finalize Run',
    })
    if (!confirmed) return

    setIsFinalizing(true)
    const result = await sendRequest(`/api/payroll-runs/${runId}/finalize`, {
      method: 'POST',
      fallbackError: 'Failed to finalize payroll run',
    })

    if (result.ok) {
      toast('Payroll run finalized')
      router.refresh()
    } else {
      toast(result.error, 'error')
    }
    setIsFinalizing(false)
  }

  return (
    <Button onClick={handleFinalize} disabled={isFinalizing}>
      {isFinalizing ? 'Finalizing...' : 'Finalize Run'}
    </Button>
  )
}
