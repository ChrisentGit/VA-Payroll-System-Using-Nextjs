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

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/users/[id] — a blank password keeps the current one.
// There is no DELETE: users are deactivated so their audit history still makes sense.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await authorizeApi('users:manage')
    if (guard.error) return guard.error
    const { session } = guard

    const { id } = await params
    const { name, email, role, isActive, contractorId, password } = await request.json()

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { contractor: { select: { id: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Admins cannot lower their own access, so at least one admin always remains
    const nextRole = role ?? existing.role
    if (id === session.user.id && (nextRole !== existing.role || isActive === false)) {
      return NextResponse.json(
        { error: 'You cannot change your own role or deactivate your own account' },
        { status: 400 }
      )
    }

    if (!isRole(nextRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (name !== undefined && !name) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    if (email !== undefined && !email) {
      return NextResponse.json({ error: 'email cannot be empty' }, { status: 400 })
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be true or false' }, { status: 400 })
    }

    if (password) {
      const problem = passwordProblem(password)
      if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    }

    const linkedContractorId =
      nextRole === 'CONTRACTOR' ? contractorId || existing.contractor?.id || null : null

    if (nextRole === 'CONTRACTOR' && !linkedContractorId) {
      return NextResponse.json(
        { error: 'Choose the contractor profile this login belongs to' },
        { status: 400 }
      )
    }

    const passwordHash = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : undefined

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          name,
          email: email === undefined ? undefined : normalizeEmail(email),
          role: nextRole,
          isActive,
          passwordHash,
        },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      })

      await linkContractor(tx, id, linkedContractorId)

      await recordAudit(tx, session, {
        action: 'user.updated',
        entityType: 'User',
        entityId: id,
        metadata: {
          email: updated.email,
          role: updated.role,
          isActive: updated.isActive,
          contractorId: linkedContractorId,
          passwordReset: Boolean(password),
        },
      })

      return updated
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof ContractorAlreadyLinkedError) {
      return NextResponse.json({ error: 'That contractor already has a login' }, { status: 409 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    console.error('PATCH /api/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
