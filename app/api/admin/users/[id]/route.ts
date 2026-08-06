import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    const requestedRole = typeof role === 'string' ? role.toUpperCase() : '';
    if (!['GUEST', 'REGISTERED', 'USER', 'ADMIN'].includes(requestedRole)) {
      return NextResponse.json(
        { error: 'Valid role (GUEST, REGISTERED, ADMIN) is required' },
        { status: 400 }
      );
    }

    const session = getSessionFromRequest(request);
    if (session?.userId === id && requestedRole !== 'ADMIN') {
      return NextResponse.json({ error: 'You cannot remove your own administrator access.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const persistedRole = requestedRole === 'REGISTERED' ? 'USER' : requestedRole;
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: persistedRole },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json({
      user: {
        ...updatedUser,
        role: updatedUser.role === 'USER' ? 'REGISTERED' : updatedUser.role,
        rating: 0,
      },
      message: `User role updated to ${requestedRole}`,
    });
  } catch (error: unknown) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
