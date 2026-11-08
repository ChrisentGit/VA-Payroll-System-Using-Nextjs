'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white"
    >
      Sign out
    </button>
  )
}
