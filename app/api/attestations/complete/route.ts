import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Constants stay outside (Safe for build)
const TASK_REWARDS: Record<string, number> = {
  'land-control': 100,
  'interconnection': 150,
  'engineering-study': 200,
  'permit-review': 125,
  'site-inspection': 175,
};

export async function POST(request: NextRequest) {
  try {
    // 1. Get Env Vars inside the handler
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // We use SERVICE_ROLE_KEY here so the server has permission to insert rewards
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; 

    if (!url || !key) {
      console.error('Missing Supabase Environment Variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Initialize client inside the handler
    const supabase = createClient(url, key);

    const body = await request.json();
    const { wallet, taskId, taskType } = body;

    if (!wallet || !taskId || !taskType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Logic Execution
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (userErr || !user) {
      console.error('User lookup failed:', userErr);
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
      console.error('Reward insert failed:', rewardErr);
      return NextResponse.json({ error: 'Failed to add reward' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      reward: rewardAmount, 
      rewardId: reward?.id 
    });

  } catch (err: any) {
    console.error('Attestation error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}