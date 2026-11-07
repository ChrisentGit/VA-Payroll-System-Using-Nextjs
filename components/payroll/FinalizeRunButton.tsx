'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function FinalizeRunButton({ runId }: { runId: string }) {
  const router = useRouter()
  const [isFinalizing, setIsFinalizing] = useState(false)

  async function handleFinalize() {
    const confirmed = window.confirm(
      'Finalize this payroll run? This locks it from further changes.'
    )
    if (!confirmed) return

    setIsFinalizing(true)
    const response = await fetch(`/api/payroll-runs/${runId}/finalize`, { method: 'POST' })

    if (response.ok) {
      router.refresh()
    } else {
      alert('Failed to finalize payroll run')
      setIsFinalizing(false)
    }
  }

  return (
    <Button onClick={handleFinalize} disabled={isFinalizing}>
      {isFinalizing ? 'Finalizing...' : 'Finalize Run'}
    </Button>
  )
}