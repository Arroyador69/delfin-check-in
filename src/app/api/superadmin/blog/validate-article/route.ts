/**
 * POST /api/superadmin/blog/validate-article
 * Valida payload JSON (estricto, tipo OpenAI) o solo el HTML del cuerpo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import {
  parseAndValidateBlogOpenAIResponse,
  validateBlogArticleStrictPayload,
  validateBlogContentOnly
} from '@/lib/blog-template';

export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const mode = (body.mode as string) || 'content'; // 'content' | 'strict' | 'raw'

    if (mode === 'raw' && typeof body.raw === 'string') {
      try {
        const data = parseAndValidateBlogOpenAIResponse(body.raw);
        return NextResponse.json({ success: true, valid: true, data });
      } catch (e: any) {
        return NextResponse.json({
          success: true,
          valid: false,
          errors: [e?.message || String(e)]
        });
      }
    }

    if (mode === 'strict') {
      const r = validateBlogArticleStrictPayload(body.payload ?? body);
      if (r.valid) {
        return NextResponse.json({ success: true, valid: true, data: r.data });
      }
      return NextResponse.json({ success: true, valid: false, errors: r.errors });
    }

    const content = body.content ?? body.payload?.content;
    const r = validateBlogContentOnly(content);
    return NextResponse.json({
      success: true,
      valid: r.valid,
      errors: r.errors
    });
  } catch (err: any) {
    console.error('validate-article:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error de validación' },
      { status: 500 }
    );
  }
}
