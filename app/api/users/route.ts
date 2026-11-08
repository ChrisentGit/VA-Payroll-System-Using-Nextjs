import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import {
  BCRYPT_ROUNDS,
  ContractorAlreadyLinkedError,
  isRole,
  linkContractor,
  normalizeEmail,
  passwordProblem,
} from '@/lib/users'

// POST /api/users — the password is a temporary one for the user to change
export async function POST(request: NextRequest) {
  try {
    const guard = await authorizeApi('users:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { name, email, role, password, contractorId } = await request.json()

    if (!name || !email || !isRole(role)) {
      return NextResponse.json({ error: 'name, email and a valid role are required' }, { status: 400 })
    }

    const problem = passwordProblem(password)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })

    if (role === 'CONTRACTOR' && !contractorId) {
      return NextResponse.json(
        { error: 'Choose the contractor profile this login belongs to' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email: normalizeEmail(email), role, passwordHash },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      })

      if (role === 'CONTRACTOR') await linkContractor(tx, created.id, contractorId)

      await recordAudit(tx, session, {
        action: 'user.created',
        entityType: 'User',
        entityId: created.id,
        metadata: { email: created.email, role },
      })

      return created
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof ContractorAlreadyLinkedError) {
      return NextResponse.json(
        { error: 'That contractor already has a login' },
        { status: 409 }
      )
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
