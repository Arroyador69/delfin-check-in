import { sql } from '@/lib/db';
import {
  MIR_CREDENTIALS_VIDEO_ID,
  MIR_CREDENTIALS_VIDEO_URL,
  ONBOARDING_VIDEO_ID,
  ONBOARDING_VIDEO_URL,
  SEQUENCE_KEY_PHASE_1,
  SEQUENCE_KEY_PHASE_2,
} from '@/lib/email-sequences/constants';

let schemaReady = false;

export async function ensureEmailSequenceSchema(): Promise<boolean> {
  if (schemaReady) return true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS email_sequences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        key VARCHAR(80) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        phase INTEGER NOT NULL DEFAULT 1,
        goal_description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS email_sequence_steps (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        template_key VARCHAR(80) NOT NULL,
        delay_days INTEGER NOT NULL DEFAULT 0,
        condition_json JSONB,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(sequence_id, step_order)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
        current_step INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(30) DEFAULT 'active',
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        last_sent_at TIMESTAMPTZ,
        next_send_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, sequence_id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS email_unsubscribes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        scope VARCHAR(50) DEFAULT 'lifecycle',
        reason TEXT,
        unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(email, scope)
      )
    `;
    schemaReady = true;
    return true;
  } catch (e) {
    console.error('ensureEmailSequenceSchema:', e);
    return false;
  }
}

type StepSeed = {
  step_order: number;
  template_key: string;
  delay_days: number;
  condition_json?: Record<string, unknown> | null;
};

const PHASE_1_STEPS: StepSeed[] = [
  { step_order: 0, template_key: 'p1_welcome', delay_days: 0 },
  { step_order: 1, template_key: 'p1_video', delay_days: 2 },
  { step_order: 2, template_key: 'p1_mir_video', delay_days: 2 },
  { step_order: 3, template_key: 'p1_social_proof', delay_days: 2 },
  {
    step_order: 4,
    template_key: 'p1_resume',
    delay_days: 3,
    condition_json: { onboarding_status_in: ['in_progress', 'pending'] },
  },
  { step_order: 5, template_key: 'p1_help', delay_days: 3 },
  { step_order: 6, template_key: 'p1_last_push', delay_days: 4 },
  {
    step_order: 7,
    template_key: 'p1_reengagement',
    delay_days: 5,
    condition_json: { require_not_opened_previous: true },
  },
];

const PHASE_2_STEPS: StepSeed[] = [
  { step_order: 0, template_key: 'p2_unlock', delay_days: 0 },
  { step_order: 1, template_key: 'p2_use_case', delay_days: 3 },
  { step_order: 2, template_key: 'p2_offer', delay_days: 4 },
  { step_order: 3, template_key: 'p2_questions', delay_days: 7 },
];

async function upsertSequence(
  key: string,
  name: string,
  description: string,
  phase: number,
  goal: string,
  steps: StepSeed[]
): Promise<void> {
  const seq = await sql`
    INSERT INTO email_sequences (key, name, description, phase, goal_description, active)
    VALUES (${key}, ${name}, ${description}, ${phase}, ${goal}, true)
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      phase = EXCLUDED.phase,
      goal_description = EXCLUDED.goal_description,
      updated_at = NOW()
    RETURNING id
  `;
  const sequenceId = String(seq.rows[0]?.id);
  for (const step of steps) {
    await sql`
      INSERT INTO email_sequence_steps (
        sequence_id, step_order, template_key, delay_days, condition_json, active
      ) VALUES (
        ${sequenceId},
        ${step.step_order},
        ${step.template_key},
        ${step.delay_days},
        ${step.condition_json ? JSON.stringify(step.condition_json) : null}::jsonb,
        true
      )
      ON CONFLICT (sequence_id, step_order) DO UPDATE SET
        template_key = EXCLUDED.template_key,
        delay_days = EXCLUDED.delay_days,
        condition_json = EXCLUDED.condition_json,
        active = EXCLUDED.active
    `;
  }
}

/** Idempotente: crea tablas y siembra secuencias Fase 1 y Fase 2. */
export async function seedEmailSequences(): Promise<void> {
  await ensureEmailSequenceSchema();
  await upsertSequence(
    SEQUENCE_KEY_PHASE_1,
    'Fase 1 — Activación onboarding',
    'Recordatorios personalizados para completar onboarding y crear la primera propiedad.',
    1,
    'onboarding_status=completed y al menos 1 unidad creada',
    PHASE_1_STEPS
  );
  await upsertSequence(
    SEQUENCE_KEY_PHASE_2,
    'Fase 2 — Conversión a plan de pago',
    'Secuencia para propietarios activos en plan gratuito que pueden mejorar su plan.',
    2,
    'plan de pago activo (checkin, standard o pro)',
    PHASE_2_STEPS
  );
}

export async function getSequenceByKey(key: string): Promise<{ id: string; key: string } | null> {
  await ensureEmailSequenceSchema();
  const r = await sql`
    SELECT id, key FROM email_sequences WHERE key = ${key} AND active = true LIMIT 1
  `;
  if (!r.rows[0]) return null;
  return { id: String(r.rows[0].id), key: String(r.rows[0].key) };
}

export function getOnboardingVideoThumbnailUrl(): string {
  return `https://img.youtube.com/vi/${ONBOARDING_VIDEO_ID}/hqdefault.jpg`;
}

export function getMirVideoThumbnailUrl(): string {
  return `https://img.youtube.com/vi/${MIR_CREDENTIALS_VIDEO_ID}/hqdefault.jpg`;
}

export { ONBOARDING_VIDEO_URL, MIR_CREDENTIALS_VIDEO_URL };
