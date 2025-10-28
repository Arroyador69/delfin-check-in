import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const xml = (json && json.xml) || '<?xml version="1.0" encoding="UTF-8"?><root/>';
    const zip = new JSZip();
    zip.file('solicitud.xml', Buffer.from(xml, 'utf8'), { createFolders: false });
    const zipped = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return new NextResponse(zipped, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="solicitud.zip"'
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


