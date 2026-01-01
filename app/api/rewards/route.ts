import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Force dynamic ensures this never crashes during build and always fetches live data
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Extract wallet from searchParams
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet required' }, { status: 400 });
  }

  try {
    // 2. Initialize Supabase inside the handler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for reliability

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Get user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (userErr || !user) {
      // Return empty stats instead of an error if user doesn't exist yet
      return NextResponse.json({ rewards: [], totalClaimed: 0, pendingRewards: 0 });
    }

    // 4. Get rewards history
    const { data: rewards, error: rewardsErr } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (rewardsErr) throw rewardsErr;

    // 5. Calculate stats
    const totalClaimed = rewards?.reduce((acc, r) => r.claimed ? acc + Number(r.amount) : acc, 0) || 0;
    const pendingRewards = rewards?.reduce((acc, r) => !r.claimed ? acc + Number(r.amount) : acc, 0) || 0;

    return NextResponse.json({ 
      rewards: rewards || [],
      totalClaimed,
      pendingRewards
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (error: any) {
    console.error('Rewards API error:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards data' }, { status: 500 });
  }
}