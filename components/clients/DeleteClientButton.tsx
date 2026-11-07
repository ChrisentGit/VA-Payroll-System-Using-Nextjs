'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DeleteClientButton({ id }: { id: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = window.confirm('Delete this client? This cannot be undone.')
    if (!confirmed) return

    setIsDeleting(true)
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      router.refresh()
    } else {
      const data = await response.json()
      alert(data.error || 'Failed to delete client')
      setIsDeleting(false)
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  )
}