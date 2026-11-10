'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Notice } from '@/components/ui/notice'
import { formatDate, formatMoney, todayInCompanyZone } from '@/lib/format'

interface RateEntry {
  id: string
  amount: string
  currency: string
  effectiveFrom: string
  effectiveTo: string | null
  notes: string | null
}

export default function RateHistoryCard({
  engagementId,
  rates,
}: {
  engagementId: string
  rates: RateEntry[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('PHP')
  const [effectiveFrom, setEffectiveFrom] = useState(
    todayInCompanyZone()
  )
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAddRate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const response = await fetch(`/api/engagements/${engagementId}/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, effectiveFrom, notes }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Something went wrong')
      setIsSubmitting(false)
      return
    }

    setShowForm(false)
    setAmount('')
    setNotes('')
    setIsSubmitting(false)
    router.refresh()
  }

  return (
    <div className="max-w-2xl rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Rate history</h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Add New Rate
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleAddRate}
          className="space-y-3 mb-4 border-b pb-4"
        >
          {error && (
            <Notice tone="error">{error}</Notice>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHP">PHP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save New Rate'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {rates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rates recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {rates.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0"
            >
              <div>
                <span className="font-medium tabular-nums">{formatMoney(r.currency, r.amount)}</span>
                <span className="text-muted-foreground ml-2">
                  {formatDate(new Date(r.effectiveFrom))} to{' '}
                  {r.effectiveTo ? formatDate(new Date(r.effectiveTo)) : 'present'}
                </span>
                {r.notes && (
                  <p className="text-muted-foreground text-xs mt-0.5">{r.notes}</p>
                )}
              </div>
              {!r.effectiveTo && <StatusBadge status="ACTIVE" label="Current" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}