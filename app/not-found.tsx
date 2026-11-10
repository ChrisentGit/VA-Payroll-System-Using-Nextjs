import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Logo } from '@/components/shell/Logo'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Logo />
      <div className="w-full max-w-md">
        <EmptyState
          icon={SearchX}
          title="We could not find that page"
          description="It may have been moved or deleted."
          action={
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}
