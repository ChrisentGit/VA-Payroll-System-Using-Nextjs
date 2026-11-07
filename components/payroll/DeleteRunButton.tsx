'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DeleteRunButton({ runId, periodId }: { runId: string; periodId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this draft run? Its timesheets and milestones go back to unpaid, and you can generate it again.'
    )
    if (!confirmed) return

    setIsDeleting(true)
    const response = await fetch(`/api/payroll-runs/${runId}`, { method: 'DELETE' })

    if (response.ok) {
      router.push(`/dashboard/payroll/${periodId}`)
      router.refresh()
    } else {
      const data = await response.json()
      alert(data.error || 'Failed to delete payroll run')
      setIsDeleting(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : 'Delete Draft'}
    </Button>
  )
}
