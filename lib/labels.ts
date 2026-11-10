const RATE_TYPES: Record<string, string> = {
  HOURLY: 'Hourly',
  RETAINER: 'Retainer',
  PER_PROJECT: 'Per project',
}

const ROLES: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  FINANCE_OFFICER: 'Finance officer',
  CLIENT_MANAGER: 'Client manager',
  CONTRACTOR: 'Contractor',
}

export function rateTypeLabel(rateType: string): string {
  return RATE_TYPES[rateType] ?? rateType
}

export function roleLabel(role: string | undefined): string {
  return role ? (ROLES[role] ?? role) : ''
}

export function payFrequencyLabel(frequency: string): string {
  return frequency === 'SEMI_MONTHLY' ? 'Twice a month' : 'Monthly'
}

export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? ''
}
