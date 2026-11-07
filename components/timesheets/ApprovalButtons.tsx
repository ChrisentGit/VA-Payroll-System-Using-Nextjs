'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ApprovalButtons({
  id,
  rejectOnly = false,
}: {
  id: string
  rejectOnly?: boolean
}) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleApprove() {
    setIsProcessing(true)
    const response = await fetch(`/api/timesheets/${id}/approve`, { method: 'POST' })
    if (response.ok) {
      router.refresh()
    } else {
      alert('Failed to approve timesheet')
      setIsProcessing(false)
    }
  }

  async function handleReject() {
    const reason = window.prompt('Reason for rejection:')
    if (!reason) return

    setIsProcessing(true)
    const response = await fetch(`/api/timesheets/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason: reason }),
    })
    if (response.ok) {
      router.refresh()
    } else {
      alert('Failed to reject timesheet')
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex gap-2">
      {!rejectOnly && (
        <Button size="sm" onClick={handleApprove} disabled={isProcessing}>
          Approve
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={handleReject} disabled={isProcessing}>
        Reject
      </Button>
    </div>
  )
}