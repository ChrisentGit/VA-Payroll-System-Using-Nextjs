'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useFeedback } from '@/components/ui/feedback'
import { sendRequest } from '@/lib/client-request'

export default function DeleteButton({
  url,
  noun,
  description = 'This cannot be undone.',
  label = 'Delete',
  redirectTo,
}: {
  url: string
  // What is being deleted, in lower case, such as "client"
  noun: string
  description?: string
  label?: string
  redirectTo?: string
}) {
  const router = useRouter()
  const { confirm, toast } = useFeedback()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete this ${noun}?`,
      description,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    setIsDeleting(true)
    const result = await sendRequest(url, {
      method: 'DELETE',
      fallbackError: `Failed to delete ${noun}`,
    })

    if (!result.ok) {
      toast(result.error, 'error')
      setIsDeleting(false)
      return
    }

    toast(`Deleted the ${noun}`)
    if (redirectTo) router.push(redirectTo)
    router.refresh()
    if (!redirectTo) setIsDeleting(false)
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : label}
    </Button>
  )
}
