import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

function hasBOM(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const xml = (json && json.xml) || '<?xml version="1.0" encoding="UTF-8"?><root/>';

    // Generar ZIP (DEFLATE)
    const zip = new JSZip();
    const xmlBuffer = Buffer.from(xml, 'utf8');
    if (hasBOM(xmlBuffer)) {
      return NextResponse.json({ success: false, error: 'XML contiene BOM' }, { status: 400 });
    }
    zip.file('solicitud.xml', xmlBuffer, { createFolders: false });
    const zipped = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    // Base64 sin saltos
    const b64 = Buffer.from(zipped).toString('base64');
    const hasNewlines = /\n|\r/.test(b64);

    return NextResponse.json({
      success: true,
      checks: {
        utf8NoBOM: !hasBOM(xmlBuffer),
        zipSingleFile: true,
        compression: 'DEFLATE',
        base64NoNewlines: !hasNewlines
      },
      base64Sample: b64.slice(0, 80) + '...'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


