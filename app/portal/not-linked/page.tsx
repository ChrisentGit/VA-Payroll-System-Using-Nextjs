import { requirePagePermission } from '@/lib/authz'

export default async function NotLinkedPage() {
  await requirePagePermission('portal:access')

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-2">Your profile is not set up yet</h1>
      <p className="text-gray-600">
        This login is not linked to a contractor profile. Please ask your administrator to link it.
      </p>
    </div>
  )
}
