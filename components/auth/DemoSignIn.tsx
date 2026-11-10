'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'

type DemoAccount = 'admin' | 'contractor'

export default function DemoSignIn() {
  const router = useRouter()
  const [busy, setBusy] = useState<DemoAccount | null>(null)
  const [error, setError] = useState('')

  async function enter(account: DemoAccount) {
    setBusy(account)
    setError('')

    const result = await signIn('demo', { account, redirect: false })

    if (result?.error) {
      setError('The demo is not available right now. Please try again later.')
      setBusy(null)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      <Button size="lg" className="w-full" disabled={busy !== null} onClick={() => enter('admin')}>
        <ShieldCheck aria-hidden />
        {busy === 'admin' ? 'Opening...' : 'Continue as admin'}
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="w-full"
        disabled={busy !== null}
        onClick={() => enter('contractor')}
      >
        <UserRound aria-hidden />
        {busy === 'contractor' ? 'Opening...' : 'Continue as contractor'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Everything in the demo is made up, and changes are not saved.
      </p>
    </div>
  )
}
