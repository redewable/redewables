import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet required' }, { status: 400 });
  }

  try {
    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (!user) {
      return NextResponse.json({ rewards: [], totalClaimed: 0 });
    }

    // Get rewards history
    const { data: rewards } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const totalClaimed = rewards?.reduce((acc, r) => r.claimed ? acc + Number(r.amount) : acc, 0) || 0;
    const pendingRewards = rewards?.reduce((acc, r) => !r.claimed ? acc + Number(r.amount) : acc, 0) || 0;

    return NextResponse.json({ 
      rewards: rewards || [],
      totalClaimed,
      pendingRewards
    });
  } catch (error: any) {
    console.error('Rewards error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}