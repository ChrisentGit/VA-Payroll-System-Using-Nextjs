import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { BCRYPT_ROUNDS, passwordProblem } from '@/lib/users'

// POST /api/account/password — any signed-in user changing their own password
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    const problem = passwordProblem(newPassword)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })

    if (
      !user ||
      typeof currentPassword !== 'string' ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      return NextResponse.json({ error: 'Your current password is incorrect' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      recordAudit(prisma, session, {
        action: 'user.password_changed',
        entityType: 'User',
        entityId: user.id,
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/account/password error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
