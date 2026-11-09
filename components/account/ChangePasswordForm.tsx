'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ChangePasswordFormProps {
  email: string
  // True while the user is still on a temporary password an admin set
  forced: boolean
}

export default function ChangePasswordForm({ email, forced }: ChangePasswordFormProps) {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json()

      if (response.ok) {
        // Changing the password ended every session, this one included
        const result = await signIn('credentials', { email, password: newPassword, redirect: false })

        if (result?.error) {
          router.push('/login')
          return
        }
        if (forced) {
          // A full load, because the router has cached redirects back to this page
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign('/dashboard')
          return
        }

        setSaved(true)
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      console.error('Change password error:', err)
      setError('Network error — please try again')
    }

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      {forced && (
        <div className="bg-amber-50 text-amber-900 text-sm p-3 rounded-md border border-amber-200">
          You are using a temporary password. Choose your own to continue.
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 text-green-800 text-sm p-3 rounded-md border border-green-200">
          Your password has been changed. Any other devices have been signed out.
        </div>
      )}

      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="newPassword">New password (at least 12 characters)</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Change Password'}
      </Button>
    </form>
  )
}
