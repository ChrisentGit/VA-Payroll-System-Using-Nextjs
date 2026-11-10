'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Notice } from '@/components/ui/notice'
import { todayInCompanyZone } from '@/lib/format'

const QUICK_HOURS = ['4', '6', '8']

interface Option {
  id: string
  label: string
}

interface TimesheetFormProps {
  engagements: Option[]
  timesheetId?: string
  // The contractor portal saves through its own API and returns to its own list
  apiPath?: string
  returnTo?: string
  // One-tap hour buttons, for contractors entering time on a phone
  quickHours?: boolean
  initialData?: {
    engagementId: string
    date: string
    hours: string | null
    description: string | null
  }
}

export default function TimesheetForm({
  engagements,
  timesheetId,
  apiPath = '/api/timesheets',
  returnTo = '/dashboard/timesheets',
  quickHours = false,
  initialData,
}: TimesheetFormProps) {
  const router = useRouter()
  const isEditing = Boolean(timesheetId)

  const [formData, setFormData] = useState({
    // With only one option there is nothing to choose
    engagementId: initialData?.engagementId || (engagements.length === 1 ? engagements[0].id : ''),
    date: initialData?.date?.split('T')[0] || todayInCompanyZone(),
    hours: initialData?.hours || '',
    description: initialData?.description || '',
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
      const url = isEditing ? `${apiPath}/${timesheetId}` : apiPath
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

      router.push(returnTo)
      router.refresh()
    } catch (err) {
      console.error('Form submit error:', err)
      setError('Network error. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      <div>
        <Label htmlFor="engagementId">Engagement</Label>
        <Select
          value={formData.engagementId}
          onValueChange={(value) => handleChange('engagementId', value)}
          disabled={isEditing}
        >
          <SelectTrigger id="engagementId">
            <SelectValue placeholder="Select an engagement" />
          </SelectTrigger>
          <SelectContent>
            {engagements.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEditing && (
          <p className="text-xs text-muted-foreground mt-1">
            The engagement can&apos;t be changed. To use a different one, delete this entry and add it again.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="hours">Hours</Label>
        <Input
          id="hours"
          type="number"
          step="0.25"
          min="0"
          inputMode="decimal"
          value={formData.hours}
          onChange={(e) => handleChange('hours', e.target.value)}
        />
        {quickHours && (
          <div className="mt-2 flex gap-2">
            {QUICK_HOURS.map((hours) => (
              <Button
                key={hours}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                aria-pressed={formData.hours === hours}
                onClick={() => handleChange('hours', hours)}
              >
                {hours} hrs
              </Button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">Leave blank for deliverable-based work.</p>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit Timesheet'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnTo)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}