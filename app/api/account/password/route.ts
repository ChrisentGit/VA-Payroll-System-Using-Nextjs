import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { clearAttempts, countAttempt } from '@/lib/throttle'
import { BCRYPT_ROUNDS, passwordProblem } from '@/lib/users'
import { clientErrorResponse, readBody } from '@/lib/validation'

const MAX_ATTEMPTS = 10

// POST /api/account/password — any signed-in user changing their own password
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await readBody(request)

    const problem = passwordProblem(newPassword)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: 'Choose a password different from your current one' },
        { status: 400 }
      )
    }

    // Limits guessing from a session left open on someone else's screen
    const throttleKey = `password:${session.user.id}`
    if ((await countAttempt(throttleKey)) > MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait 15 minutes and try again.' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })

    if (
      !user ||
      typeof currentPassword !== 'string' ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      return NextResponse.json({ error: 'Your current password is incorrect' }, { status: 400 })
    }

    await clearAttempts(throttleKey)

    const passwordHash = await bcrypt.hash(newPassword as string, BCRYPT_ROUNDS)

    await prisma.$transaction([
      // The version bump ends every session, so the form signs in again afterwards
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, sessionVersion: { increment: 1 }, mustChangePassword: false },
      }),
      recordAudit(prisma, session, {
        action: 'user.password_changed',
        entityType: 'User',
        entityId: user.id,
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    console.error('POST /api/account/password error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
