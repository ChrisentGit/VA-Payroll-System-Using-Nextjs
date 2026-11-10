'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFeedback } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Notice } from '@/components/ui/notice'

// Local copy of the labels, because lib/payment-details.ts is server-only (it decrypts)
const METHODS = [
  ['BANK_TRANSFER', 'Bank transfer'],
  ['GCASH', 'GCash'],
  ['MAYA', 'Maya'],
  ['PAYPAL', 'PayPal'],
  ['WISE', 'Wise'],
  ['OTHER', 'Other'],
] as const

interface Detail {
  id: string
  method: string
  accountName: string
  accountNumberMasked: string
  bankName: string | null
  isDefault: boolean
}

const EMPTY = { method: 'BANK_TRANSFER', accountName: '', accountNumber: '', bankName: '' }

export default function PaymentDetailsCard({
  contractorId,
  details,
}: {
  contractorId: string
  details: Detail[]
}) {
  const router = useRouter()
  const { confirm } = useFeedback()
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  function close() {
    setForm(EMPTY)
    setEditingId(null)
    setIsOpen(false)
    setError('')
  }

  function startEdit(detail: Detail) {
    setForm({
      method: detail.method,
      accountName: detail.accountName,
      accountNumber: '',
      bankName: detail.bankName || '',
    })
    setEditingId(detail.id)
    setIsOpen(true)
    setError('')
  }

  async function send(url: string, method: string, body?: object): Promise<boolean> {
    setIsBusy(true)
    setError('')

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Something went wrong')
        return false
      }

      router.refresh()
      return true
    } catch (err) {
      console.error('Payment detail error:', err)
      setError('Network error. Please try again.')
      return false
    } finally {
      setIsBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const saved = editingId
      ? await send(`/api/payment-details/${editingId}`, 'PATCH', form)
      : await send(`/api/contractors/${contractorId}/payment-details`, 'POST', form)

    if (saved) close()
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete this payment detail?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (confirmed) await send(`/api/payment-details/${id}`, 'DELETE')
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Payment details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Notice tone="error">{error}</Notice>
        )}

        {details.length === 0 && !isOpen && (
          <p className="text-sm text-muted-foreground">No payment details yet.</p>
        )}

        {details.map((detail) => (
          <div key={detail.id} className="border rounded-md p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {METHODS.find(([value]) => value === detail.method)?.[1] ?? detail.method}
                {detail.bankName ? ` — ${detail.bankName}` : ''}
              </span>
              {detail.isDefault && <StatusBadge status="ACTIVE" label="Default" />}
            </div>
            <div className="text-muted-foreground mt-1">
              {detail.accountName} · {detail.accountNumberMasked}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => startEdit(detail)}>
                Edit
              </Button>
              {!detail.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => send(`/api/payment-details/${detail.id}`, 'PATCH', { isDefault: true })}
                >
                  Make default
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={isBusy}
                onClick={() => handleDelete(detail.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}

        {isOpen ? (
          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
            <div>
              <Label htmlFor="pd-method">Method</Label>
              <Select
                value={form.method}
                onValueChange={(method) => setForm((f) => ({ ...f, method }))}
              >
                <SelectTrigger id="pd-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pd-name">Account name</Label>
              <Input
                id="pd-name"
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="pd-number">
                Account number{editingId ? ' (leave blank to keep the saved one)' : ''}
              </Label>
              <Input
                id="pd-number"
                autoComplete="off"
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                required={!editingId}
              />
            </div>
            <div>
              <Label htmlFor="pd-bank">Bank name (optional)</Label>
              <Input
                id="pd-bank"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isBusy}>
                {isBusy ? 'Saving...' : editingId ? 'Save Changes' : 'Add Detail'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            Add payment detail
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
