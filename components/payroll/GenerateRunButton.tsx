'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function GenerateRunButton({ periodId }: { periodId: string }) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    const response = await fetch(`/api/payroll-periods/${periodId}/generate-run`, {
      method: 'POST',
    })
    const data = await response.json()

    if (!response.ok) {
      alert(data.error || 'Failed to generate payroll run')
      setIsGenerating(false)
      return
    }

    router.push(`/dashboard/payroll/runs/${data.id}`)
  }

  return (
    <Button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : 'Generate Draft Run'}
    </Button>
  )
}