import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TASK_REWARDS: Record<string, number> = {
  'land-control': 100,
  'interconnection': 150,
  'engineering-study': 200,
  'permit-review': 125,
  'site-inspection': 175,
};

export async function POST(request: NextRequest) {
  try {
    const { wallet, taskId, taskType } = await request.json();

    if (!wallet || !taskId || !taskType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const rewardAmount = TASK_REWARDS[taskType] || 50;

    // Add pending reward
    const { data: reward, error } = await supabase
      .from('rewards')
      .insert({
        user_id: user.id,
        amount: rewardAmount,
        reason: `Attestation: ${taskType}`,
        claimed: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Added ${rewardAmount} $RDW reward for ${taskType}`);

    return NextResponse.json({
      success: true,
      reward: rewardAmount,
      rewardId: reward.id,
    });

  } catch (error: any) {
    console.error('Attestation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}