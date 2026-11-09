import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/authz'
import { recordAudit } from '@/lib/audit'
import { clientErrorResponse, optionalText, readBody, textIfSent } from '@/lib/validation'
import {
  BCRYPT_ROUNDS,
  ContractorAlreadyLinkedError,
  LastAdminError,
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
    const body = await readBody(request)
    const name = textIfSent(body.name, 'name', 200)
    const email = textIfSent(body.email, 'email', 254)
    const contractorId = optionalText(body.contractorId, 'contractorId')
    const { role, isActive, password } = body

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { contractor: { select: { id: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Stops the simple case early. The check inside the transaction below covers
    // two admins demoting each other at the same moment.
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
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be true or false' }, { status: 400 })
    }

    const passwordProvided = password !== undefined && password !== '' && password !== null

    if (passwordProvided) {
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

    const passwordHash = passwordProvided
      ? await bcrypt.hash(password as string, BCRYPT_ROUNDS)
      : undefined
    const mayRemoveAdmin = nextRole !== 'SUPER_ADMIN' || isActive === false

    const user = await prisma.$transaction(async (tx) => {
      // Holding these rows makes concurrent demotions take turns, so the count
      // below sees the result of the one before it.
      if (mayRemoveAdmin) {
        await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'SUPER_ADMIN' AND "isActive" = true FOR UPDATE`
      }

      const updated = await tx.user.update({
        where: { id },
        data: {
          name,
          email: email === undefined ? undefined : normalizeEmail(email),
          role: nextRole,
          isActive: isActive as boolean | undefined,
          passwordHash,
          // A reset ends the user's sessions. Someone else's password stays
          // temporary until they choose their own.
          ...(passwordProvided && {
            sessionVersion: { increment: 1 },
            mustChangePassword: id !== session.user.id,
          }),
        },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      })

      if (mayRemoveAdmin) {
        const admins = await tx.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } })
        if (admins === 0) throw new LastAdminError()
      }

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
          passwordReset: passwordProvided,
        },
      })

      return updated
    })

    return NextResponse.json(user)
  } catch (error) {
    const invalid = clientErrorResponse(error)
    if (invalid) return invalid
    if (error instanceof LastAdminError) {
      return NextResponse.json({ error: 'At least one active admin must remain' }, { status: 409 })
    }
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
