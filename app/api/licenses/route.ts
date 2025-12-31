import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Do NOT create the Supabase client at module load time.
// Next/Vercel can evaluate API routes during build. If env vars are missing then,
// creating the client here can throw and break the build.

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : null;
}

export async function GET(request: NextRequest) {
  try {
    const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (!SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Server not configured: NEXT_PUBLIC_SUPABASE_URL missing' },
        { status: 500 }
      );
    }

    if (!SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Server not configured: NEXT_PUBLIC_SUPABASE_ANON_KEY missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
      console.error('DB Error (licenses fetch):', error);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
    }

    return NextResponse.json({ licenses });
  } catch (err: any) {
    console.error('Licenses route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch licenses' }, { status: 500 });
  }
}
