import { NextResponse } from 'next/server';
import { getRequestHeaderUser } from '@/auth/request-user';
import { getRequestMarket } from '@/catalog/page-context';

export async function GET() {
  const [market, user] = await Promise.all([getRequestMarket(), getRequestHeaderUser()]);
  return NextResponse.json({ market, user }, { headers: { 'Cache-Control': 'private, no-store' } });
}
