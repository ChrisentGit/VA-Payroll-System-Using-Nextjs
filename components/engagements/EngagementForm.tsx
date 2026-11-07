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

interface Option {
  id: string
  label: string
}

interface EngagementFormProps {
  contractors: Option[]
  clients: Option[]
  engagementId?: string
  initialData?: {
    contractorId: string
    clientId: string
    title: string | null
    rateType: string
    retainerBasis: string
    projectPayMode: string
    status: string
    startDate: string | null
    endDate: string | null
  }
}

export default function EngagementForm({
  contractors,
  clients,
  engagementId,
  initialData,
}: EngagementFormProps) {
  const router = useRouter()
  const isEditing = Boolean(engagementId)

  const [formData, setFormData] = useState({
    contractorId: initialData?.contractorId || '',
    clientId: initialData?.clientId || '',
    title: initialData?.title || '',
    rateType: initialData?.rateType || 'HOURLY',
    retainerBasis: initialData?.retainerBasis || 'PER_MONTH',
    projectPayMode: initialData?.projectPayMode || 'ON_COMPLETION',
    status: initialData?.status || 'active',
    startDate: initialData?.startDate?.split('T')[0] || '',
    endDate: initialData?.endDate?.split('T')[0] || '',
    // Only used when creating (first rate) — not shown/sent when editing
    rateAmount: '',
    rateCurrency: 'PHP',
    rateEffectiveFrom: new Date().toISOString().split('T')[0],
    rateNotes: '',
  })

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const url = isEditing
        ? `/api/engagements/${engagementId}`
        : '/api/engagements'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        setIsSubmitting(false)
        return
      }

      router.push('/dashboard/engagements')
      router.refresh()
    } catch (err) {
      console.error('Form submit error:', err)
      setError('Network error — please try again')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="contractorId">Contractor</Label>
        <Select
          value={formData.contractorId}
          onValueChange={(value) => handleChange('contractorId', value)}
        >
          <SelectTrigger id="contractorId">
            <SelectValue placeholder="Select a contractor" />
          </SelectTrigger>
          <SelectContent>
            {contractors.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="clientId">Client</Label>
        <Select
          value={formData.clientId}
          onValueChange={(value) => handleChange('clientId', value)}
        >
          <SelectTrigger id="clientId">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          placeholder="e.g. Executive Assistant"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rateType">Rate type</Label>
          <Select
            value={formData.rateType}
            onValueChange={(value) => handleChange('rateType', value)}
          >
            <SelectTrigger id="rateType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOURLY">Hourly</SelectItem>
              <SelectItem value="RETAINER">Retainer</SelectItem>
              <SelectItem value="PER_PROJECT">Per project</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleChange('status', value)}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.rateType === 'RETAINER' && (
        <div>
          <Label htmlFor="retainerBasis">Retainer amount is</Label>
          <Select
            value={formData.retainerBasis}
            onValueChange={(value) => handleChange('retainerBasis', value)}
          >
            <SelectTrigger id="retainerBasis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PER_MONTH">Per month</SelectItem>
              <SelectItem value="PER_PERIOD">Per pay period</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.rateType === 'PER_PROJECT' && (
        <div>
          <Label htmlFor="projectPayMode">Pay this project</Label>
          <Select
            value={formData.projectPayMode}
            onValueChange={(value) => handleChange('projectPayMode', value)}
          >
            <SelectTrigger id="projectPayMode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ON_COMPLETION">Once, on completion</SelectItem>
              <SelectItem value="MILESTONE">By milestone</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
          />
        </div>
      </div>

      {!isEditing && (
        <div className="border-t pt-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Initial rate</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rateAmount">Amount</Label>
              <Input
                id="rateAmount"
                type="number"
                step="0.01"
                value={formData.rateAmount}
                onChange={(e) => handleChange('rateAmount', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="rateCurrency">Currency</Label>
              <Select
                value={formData.rateCurrency}
                onValueChange={(value) => handleChange('rateCurrency', value)}
              >
                <SelectTrigger id="rateCurrency">
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
            <Label htmlFor="rateEffectiveFrom">Effective from</Label>
            <Input
              id="rateEffectiveFrom"
              type="date"
              value={formData.rateEffectiveFrom}
              onChange={(e) => handleChange('rateEffectiveFrom', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="rateNotes">Rate notes (optional)</Label>
            <Input
              id="rateNotes"
              value={formData.rateNotes}
              onChange={(e) => handleChange('rateNotes', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Engagement'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/engagements')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}