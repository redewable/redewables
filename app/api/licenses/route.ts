import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : null;
}

export async function GET(request: NextRequest) {
  try {
    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!url) return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL missing' }, { status: 500 });
    if (!key) return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY missing' }, { status: 500 });

    const supabase = createClient(url, key);

    const wallet = request.nextUrl.searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });

    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('wallet_address', wallet)
      .order('minted_at', { ascending: false });

    if (error) {
      console.error('DB Error (licenses fetch):', error);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
    }

    return NextResponse.json({ licenses });
  } catch (err: any) {
    console.error('Licenses route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch licenses' }, { status: 500 });
  }
}
