'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useFeedback } from '@/components/ui/feedback'
import { sendRequest } from '@/lib/client-request'

export default function GenerateRunButton({ periodId }: { periodId: string }) {
  const router = useRouter()
  const { toast } = useFeedback()
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    const result = await sendRequest(`/api/payroll-periods/${periodId}/generate-run`, {
      method: 'POST',
      fallbackError: 'Failed to generate payroll run',
    })

    if (!result.ok) {
      toast(result.error, 'error')
      setIsGenerating(false)
      return
    }

    router.push(`/dashboard/payroll/runs/${result.data.id}`)
  }

  return (
    <Button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : 'Generate Draft Run'}
    </Button>
  )
}
