'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export default function ErrorPanel({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <EmptyState
      icon={AlertTriangle}
      title="This page could not be loaded"
      description="Something went wrong on our side. Your data has not changed."
      action={<Button onClick={() => retry()}>Try again</Button>}
    />
  )
}
