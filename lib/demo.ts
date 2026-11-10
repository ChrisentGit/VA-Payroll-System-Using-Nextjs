// Demo mode is for a separate public deployment with its own database of made-up
// records. Password sign-in is off and the API refuses every change.
export const DEMO_EMAIL_DOMAIN = 'demo.bluemoso.example'

export const DEMO_ADMIN_EMAIL = `alex.rivera@${DEMO_EMAIL_DOMAIN}`
export const DEMO_CONTRACTOR_EMAIL = `maria.santos@${DEMO_EMAIL_DOMAIN}`

export const DEMO_READ_ONLY_MESSAGE = 'This is a read-only demo, so changes are not saved.'

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true'
}
