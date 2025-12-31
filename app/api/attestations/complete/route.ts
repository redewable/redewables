import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : null;
}

const TASK_REWARDS: Record<string, number> = {
  'land-control': 100,
  'interconnection': 150,
  'engineering-study': 200,
  'permit-review': 125,
  'site-inspection': 175,
};

export async function POST(request: NextRequest) {
  try {
    const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (!SUPABASE_URL) {
      return NextResponse.json({ error: 'Server not configured: NEXT_PUBLIC_SUPABASE_URL missing' }, { status: 500 });
    }
    if (!SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Server not configured: NEXT_PUBLIC_SUPABASE_ANON_KEY missing' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { wallet, taskId, taskType } = await request.json();

    if (!wallet || !taskId || !taskType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (userErr) {
      console.error('DB Error (user lookup):', userErr);
      return NextResponse.json({ error: 'User lookup failed' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const rewardAmount = TASK_REWARDS[taskType] || 50;

    const { data: reward, error: rewardErr } = await supabase
      .from('rewards')
      .insert({
        user_id: user.id,
        amount: rewardAmount,
        reason: `Attestation: ${taskType}`,
        claimed: false,
      })
      .select()
      .single();

    if (rewardErr) {
      console.error('DB Error (reward insert):', rewardErr);
      return NextResponse.json({ error: 'Failed to add reward' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reward: rewardAmount,
      rewardId: reward?.id,
    });
  } catch (error: any) {
    console.error('Attestation error:', error);
    return NextResponse.json({ error: error.message || 'Attestation failed' }, { status: 500 });
  }
}