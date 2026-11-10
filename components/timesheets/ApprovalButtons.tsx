'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useFeedback } from '@/components/ui/feedback'
import { sendRequest } from '@/lib/client-request'

export default function ApprovalButtons({
  id,
  rejectOnly = false,
}: {
  id: string
  rejectOnly?: boolean
}) {
  const router = useRouter()
  const { ask, toast } = useFeedback()
  const [isProcessing, setIsProcessing] = useState(false)

  async function send(path: string, successMessage: string, fallbackError: string, body?: object) {
    setIsProcessing(true)
    const result = await sendRequest(`/api/timesheets/${id}/${path}`, {
      method: 'POST',
      body,
      fallbackError,
    })

    if (result.ok) {
      toast(successMessage)
      router.refresh()
    } else {
      toast(result.error, 'error')
    }
    setIsProcessing(false)
  }

  async function handleReject() {
    const reason = await ask({
      title: 'Reject this timesheet?',
      description: 'The contractor will see your reason and can fix and resubmit it.',
      label: 'Reason',
      placeholder: 'What needs to change?',
      required: true,
      multiline: true,
      confirmLabel: 'Reject',
      danger: true,
    })
    if (!reason) return

    await send('reject', 'Timesheet rejected', 'Failed to reject timesheet', {
      rejectionReason: reason,
    })
  }

  return (
    <div className="flex gap-2">
      {!rejectOnly && (
        <Button
          size="sm"
          onClick={() => send('approve', 'Timesheet approved', 'Failed to approve timesheet')}
          disabled={isProcessing}
        >
          Approve
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={handleReject} disabled={isProcessing}>
        Reject
      </Button>
    </div>
  )
}
