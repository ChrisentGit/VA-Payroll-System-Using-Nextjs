'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'

interface ExchangeRateFormProps {
  runId: string
  currencies: { currency: string; rate: string }[]
}

export default function ExchangeRateForm({ runId, currencies }: ExchangeRateFormProps) {
  const router = useRouter()
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(currencies.map((c) => [c.currency, c.rate]))
  )
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    const response = await fetch(`/api/payroll-runs/${runId}/exchange-rates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rates }),
    })

    setIsSaving(false)

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Something went wrong')
      return
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3 max-w-2xl rounded-xl border bg-card p-5 shadow-xs">
      <div>
        <h2 className="font-semibold">Exchange rates to PHP</h2>
        <p className="text-sm text-muted-foreground">
          Enter how many pesos 1 unit is worth. These are locked when the run is finalized.
        </p>
      </div>

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {currencies.map(({ currency }) => (
          <div key={currency}>
            <Label htmlFor={`rate-${currency}`}>1 {currency} in PHP</Label>
            <Input
              id={`rate-${currency}`}
              type="number"
              step="0.000001"
              min="0"
              value={rates[currency]}
              onChange={(e) =>
                setRates((prev) => ({ ...prev, [currency]: e.target.value }))
              }
              required
            />
          </div>
        ))}
      </div>

      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Rates'}
      </Button>
    </form>
  )
}
