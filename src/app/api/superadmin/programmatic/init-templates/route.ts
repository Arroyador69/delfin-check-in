import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { initTemplates } from '@/scripts/init-programmatic-templates';

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    await initTemplates();

    return NextResponse.json({
      success: true,
      message: 'Plantillas inicializadas correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error inicializando plantillas:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

