import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  const { data: licenses, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('wallet_address', wallet)
    .order('minted_at', { ascending: false });

  if (error) {
    console.error('DB Error:', error);
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
  }

  return NextResponse.json({ licenses });
}