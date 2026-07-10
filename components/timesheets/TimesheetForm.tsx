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

interface Option {
  id: string
  label: string
}

interface TimesheetFormProps {
  engagements: Option[]
  timesheetId?: string
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
  initialData,
}: TimesheetFormProps) {
  const router = useRouter()
  const isEditing = Boolean(timesheetId)

  const [formData, setFormData] = useState({
    engagementId: initialData?.engagementId || '',
    date: initialData?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
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
      const url = isEditing ? `/api/timesheets/${timesheetId}` : '/api/timesheets'
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

      router.push('/dashboard/timesheets')
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
          <p className="text-xs text-gray-500 mt-1">
            Engagement can&apos;t be changed after creation — delete and re-add if needed.
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
        <Label htmlFor="hours">Hours (optional — leave blank for deliverable-based work)</Label>
        <Input
          id="hours"
          type="number"
          step="0.25"
          value={formData.hours}
          onChange={(e) => handleChange('hours', e.target.value)}
        />
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
          onClick={() => router.push('/dashboard/timesheets')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}