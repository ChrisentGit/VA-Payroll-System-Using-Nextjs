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
import { Notice } from '@/components/ui/notice'

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super admin',
  FINANCE_OFFICER: 'Finance officer',
  CLIENT_MANAGER: 'Client manager',
  CONTRACTOR: 'Contractor (portal only)',
} as const

interface UserFormProps {
  userId?: string
  isSelf?: boolean
  contractors: { id: string; name: string }[]
  initialData?: {
    name: string
    email: string
    role: string
    isActive: boolean
    contractorId: string | null
  }
}

export default function UserForm({ userId, isSelf, contractors, initialData }: UserFormProps) {
  const router = useRouter()
  const isEditing = Boolean(userId)

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: initialData?.role || 'FINANCE_OFFICER',
    contractorId: initialData?.contractorId || '',
    isActive: initialData?.isActive ?? true,
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(isEditing ? `/api/users/${userId}` : '/api/users', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        setIsSubmitting(false)
        return
      }

      router.push('/dashboard/users')
      router.refresh()
    } catch (err) {
      console.error('User form error:', err)
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
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => update('email', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => update('role', value)}
          disabled={isSelf}
        >
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.role === 'CONTRACTOR' && (
        <div>
          <Label htmlFor="contractorId">Contractor profile</Label>
          <Select
            value={formData.contractorId}
            onValueChange={(value) => update('contractorId', value)}
          >
            <SelectTrigger id="contractorId">
              <SelectValue placeholder="Select a contractor" />
            </SelectTrigger>
            <SelectContent>
              {contractors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {contractors.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Every contractor already has a login. Add a contractor first.
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="password">
          {isEditing ? 'New password (leave blank to keep the current one)' : 'Temporary password'}
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={formData.password}
          onChange={(e) => update('password', e.target.value)}
          required={!isEditing}
        />
        <p className="text-xs text-muted-foreground mt-1">
          At least 12 characters. Ask the user to change it after signing in.
        </p>
      </div>

      {isEditing && !isSelf && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => update('isActive', e.target.checked)}
          />
          Active (can sign in)
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add User'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/users')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
