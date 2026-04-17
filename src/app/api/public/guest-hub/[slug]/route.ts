import { NextRequest, NextResponse } from 'next/server';
import { getGuestHubPublicBySlug } from '@/lib/guest-hub';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = await getGuestHubPublicBySlug(slug);
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json(data, { headers: corsHeaders });
}
