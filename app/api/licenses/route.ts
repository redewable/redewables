import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch environment variables inside the handler
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; 

    if (!url || !key) {
      console.error('Supabase configuration missing in licenses route');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Initialize Supabase client
    const supabase = createClient(url, key);

    // 3. Extract and validate wallet address
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // 4. Database Query
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('wallet_address', wallet)
      .order('minted_at', { ascending: false });

    if (error) {
      console.error('DB Error (licenses fetch):', error);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
    }

    return NextResponse.json({ licenses }, {
      // ✅ Next.js 15: Prevent aggressive caching of user-specific data
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (err: any) {
    console.error('Licenses route error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}