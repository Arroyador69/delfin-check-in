import { NextRequest, NextResponse } from 'next/server';
import { sendOnboardingEmail } from '@/lib/mailer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to');
    if (!to) return NextResponse.json({ error: 'Parámetro "to" requerido' }, { status: 400 });

    const exampleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/onboarding?token=DEMO_TOKEN&email=${encodeURIComponent(to)}`;

    await sendOnboardingEmail({ to, onboardingUrl: exampleUrl, tempPassword: 'Temporal-1234' });

    return NextResponse.json({ success: true, to, exampleUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error enviando test' }, { status: 500 });
  }
}


