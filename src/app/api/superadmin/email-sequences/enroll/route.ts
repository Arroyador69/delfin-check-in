import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { SEQUENCE_KEY_OWNER_TRIAL_MIR } from '@/lib/email-sequences/constants';
import { enrollTenantInOwnerTrialMir } from '@/lib/email-sequences/engine';
import { seedEmailSequences } from '@/lib/email-sequences/schema';

async function requireSuperAdmin(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) return null;
  const payload = verifyToken(authToken);
  if (!isEffectiveSuperAdminPayload(payload)) return null;
  return payload;
}

const BodySchema = z.object({
  tenant_id: z.string().uuid(),
  sequence_key: z
    .literal(SEQUENCE_KEY_OWNER_TRIAL_MIR)
    .default(SEQUENCE_KEY_OWNER_TRIAL_MIR),
  force: z.boolean().optional(),
});

/**
 * POST /api/superadmin/email-sequences/enroll
 * Inscribe un tenant (con opt-in/signup previo) en owner_trial_mir.
 */
export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.sequence_key !== SEQUENCE_KEY_OWNER_TRIAL_MIR) {
    return NextResponse.json(
      {
        success: false,
        error: `Solo se admite sequence_key=${SEQUENCE_KEY_OWNER_TRIAL_MIR}`,
      },
      { status: 400 }
    );
  }

  try {
    await seedEmailSequences();
    const result = await enrollTenantInOwnerTrialMir(parsed.data.tenant_id, {
      force: Boolean(parsed.data.force),
    });

    if (!result.ok) {
      const status =
        result.reason === 'tenant_not_found'
          ? 404
          : result.reason === 'unsubscribed' || result.reason === 'already_enrolled'
            ? 409
            : 400;
      return NextResponse.json(
        { success: false, reason: result.reason, enrollment_id: result.enrollment_id },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      sequence_key: SEQUENCE_KEY_OWNER_TRIAL_MIR,
      tenant_id: parsed.data.tenant_id,
      enrollment_id: result.enrollment_id,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email-sequences/enroll]', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
