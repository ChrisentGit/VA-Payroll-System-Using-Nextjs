import { UserRoundX } from 'lucide-react'
import { requirePagePermission } from '@/lib/authz'
import { EmptyState } from '@/components/ui/empty-state'

export default async function NotLinkedPage() {
  await requirePagePermission('portal:access')

  return (
    <EmptyState
      icon={UserRoundX}
      title="Your profile is almost ready"
      description="This login is not linked to a contractor profile yet. Ask your administrator to link it, then sign in again."
    />
  )
}
