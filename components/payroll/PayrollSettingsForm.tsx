'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Notice } from '@/components/ui/notice'

export default function PayrollSettingsForm({ payFrequency }: { payFrequency: string }) {
  const router = useRouter()
  const [value, setValue] = useState(payFrequency)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsSaving(true)

    const response = await fetch('/api/settings/payroll', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payFrequency: value }),
    })

    setIsSaving(false)

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Something went wrong')
      return
    }

    setMessage('Settings saved')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Notice tone="error">{error}</Notice>
      )}
      {message && (
        <Notice tone="success">{message}</Notice>
      )}

      <div>
        <Label htmlFor="payFrequency">Pay schedule</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id="payFrequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="SEMI_MONTHLY">Twice a month</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-2">
          Applies to new payroll periods. On a twice-monthly schedule, monthly retainers are
          split across the two periods.
        </p>
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  )
}
