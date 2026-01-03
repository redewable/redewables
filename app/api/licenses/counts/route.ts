import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ counts: { genesis: 0, core: 0, surge: 0 } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get counts by tier (only minted licenses)
    const { data, error } = await supabase
      .from('licenses')
      .select('tier')
      .eq('mint_status', 'minted');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ counts: { genesis: 0, core: 0, surge: 0 } });
    }

    // Count by tier
    const counts = {
      genesis: data?.filter(l => l.tier === 'genesis').length || 0,
      core: data?.filter(l => l.tier === 'core').length || 0,
      surge: data?.filter(l => l.tier === 'surge').length || 0,
    };

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching counts:', error);
    return NextResponse.json({ counts: { genesis: 0, core: 0, surge: 0 } });
  }
}