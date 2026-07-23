import { NextResponse } from 'next/server';
import { getRequestHeaderUser } from '@/auth/request-user';
import { getRequestMarket } from '@/catalog/page-context';

const privateNoStoreHeaders = {'Cache-Control': 'private, no-store'};

export async function GET() {
  try {
    const [market, user] = await Promise.all([getRequestMarket(), getRequestHeaderUser()]);
    return NextResponse.json({market, user}, {headers: privateNoStoreHeaders});
  } catch {
    return NextResponse.json(
      {status: 'error', code: 'context_unavailable'},
      {status: 503, headers: privateNoStoreHeaders}
    );
  }
}
