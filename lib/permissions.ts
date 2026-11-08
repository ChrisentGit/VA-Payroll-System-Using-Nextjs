// Single source of truth for what each role can do.
// Plain strings, no server imports, so it is safe to use anywhere.
// A role that is not listed for a permission is denied.

const PERMISSIONS = {
  'directory:read': ['SUPER_ADMIN', 'FINANCE_OFFICER', 'CLIENT_MANAGER'],
  'directory:write': ['SUPER_ADMIN', 'FINANCE_OFFICER'],
  'contractors:sensitive': ['SUPER_ADMIN', 'FINANCE_OFFICER'],
  'timesheets:manage': ['SUPER_ADMIN', 'FINANCE_OFFICER', 'CLIENT_MANAGER'],
  'payroll:manage': ['SUPER_ADMIN', 'FINANCE_OFFICER'],
  'users:manage': ['SUPER_ADMIN'],
  'audit:read': ['SUPER_ADMIN'],
  'portal:access': ['CONTRACTOR'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function can(role: string | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}
