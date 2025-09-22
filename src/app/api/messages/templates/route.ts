import { NextRequest, NextResponse } from 'next/server';
import { 
  getMessageTemplates, 
  upsertMessageTemplate, 
  deleteMessageTemplate 
} from '@/lib/db';

// GET - Obtener todas las plantillas
export async function GET() {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const templates = await getMessageTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching message templates:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener plantillas' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva plantilla
export async function POST(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const body = await request.json();
    
    const { name, trigger_type, channel, language, template_content, variables, is_active } = body;
    
    if (!name || !trigger_type || !template_content) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const template = await upsertMessageTemplate({
      name,
      trigger_type,
      channel: channel || 'whatsapp',
      language: language || 'es',
      template_content,
      variables: variables || [],
      is_active: is_active !== false
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating message template:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear plantilla' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar plantilla existente
export async function PUT(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const body = await request.json();
    
    const { id, name, trigger_type, channel, language, template_content, variables, is_active } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de plantilla requerido' },
        { status: 400 }
      );
    }

    const template = await upsertMessageTemplate({
      id,
      name,
      trigger_type,
      channel: channel || 'whatsapp',
      language: language || 'es',
      template_content,
      variables: variables || [],
      is_active: is_active !== false
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Error updating message template:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar plantilla' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar plantilla
export async function DELETE(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    
    if (!idParam) {
      return NextResponse.json(
        { success: false, error: 'ID de plantilla requerido' },
        { status: 400 }
      );
    }

    const id = Number.parseInt(String(idParam), 10);
    const deleted = await deleteMessageTemplate(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Plantilla eliminada' });
  } catch (error) {
    console.error('Error deleting message template:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar plantilla' },
      { status: 500 }
    );
  }
}
