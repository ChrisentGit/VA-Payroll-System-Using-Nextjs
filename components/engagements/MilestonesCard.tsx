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
import { Badge } from '@/components/ui/badge'

interface MilestoneEntry {
  id: string
  title: string
  amount: string
  currency: string
  completedAt: string | null
  inPayroll: boolean
}

interface MilestonesCardProps {
  engagementId: string
  payMode: string
  milestones: MilestoneEntry[]
}

const today = () => new Date().toISOString().split('T')[0]

export default function MilestonesCard({ engagementId, payMode, milestones }: MilestonesCardProps) {
  const router = useRouter()
  const isOnCompletion = payMode === 'ON_COMPLETION'

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('PHP')
  const [completedAt, setCompletedAt] = useState(today())
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function send(url: string, method: string, body?: object) {
    setError('')
    setIsBusy(true)

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    setIsBusy(false)

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Something went wrong')
      return false
    }

    router.refresh()
    return true
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const added = await send(`/api/engagements/${engagementId}/milestones`, 'POST', {
      title,
      amount,
      currency,
    })
    if (added) {
      setTitle('')
      setAmount('')
    }
  }

  return (
    <div className="border rounded-lg p-4 max-w-lg">
      <h2 className="font-semibold mb-1">
        {isOnCompletion ? 'Project completion' : 'Milestones'}
      </h2>
      <p className="text-sm text-gray-500 mb-3">
        {isOnCompletion
          ? 'Paid once, in the first payroll run after the project is marked complete.'
          : 'Each milestone is paid once, in the first payroll run after it is marked done.'}
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200 mb-3">
          {error}
        </div>
      )}

      {milestones.length > 0 && (
        <ul className="space-y-2 mb-4">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
              <div>
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-sm text-gray-500">
                  {m.currency} {m.amount}
                  {m.completedAt && ` · Done ${m.completedAt.split('T')[0]}`}
                </p>
              </div>
              {m.inPayroll ? (
                <Badge>In payroll</Badge>
              ) : (
                <div className="flex gap-2">
                  {!isOnCompletion && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() =>
                        send(`/api/milestones/${m.id}`, 'PATCH', {
                          completed: !m.completedAt,
                          completedAt,
                        })
                      }
                    >
                      {m.completedAt ? 'Undo' : 'Mark Done'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => send(`/api/milestones/${m.id}`, 'DELETE')}
                  >
                    {isOnCompletion ? 'Undo' : 'Delete'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {(!isOnCompletion || milestones.length === 0) && (
        <div className="mb-4 max-w-48">
          <Label htmlFor="completedAt">Completion date</Label>
          <Input
            id="completedAt"
            type="date"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
          />
        </div>
      )}

      {isOnCompletion && milestones.length === 0 && (
        <Button
          size="sm"
          disabled={isBusy}
          onClick={() => send(`/api/engagements/${engagementId}/complete`, 'POST', { completedAt })}
        >
          Mark Project Complete
        </Button>
      )}

      {!isOnCompletion && (
        <form onSubmit={handleAdd} className="border-t pt-4 space-y-3">
          <div>
            <Label htmlFor="milestoneTitle">Milestone</Label>
            <Input
              id="milestoneTitle"
              placeholder="e.g. Website launched"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="milestoneAmount">Amount</Label>
              <Input
                id="milestoneAmount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="milestoneCurrency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="milestoneCurrency">
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
          <Button type="submit" size="sm" disabled={isBusy}>
            Add Milestone
          </Button>
        </form>
      )}
    </div>
  )
}
