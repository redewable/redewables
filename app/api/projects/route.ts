import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Force dynamic to ensure the list of projects is always fresh 
// and doesn't crash during the build process.
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Note: Using ANON_KEY here is perfect for a public projects list.
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase configuration missing' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DB Error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }

  return NextResponse.json({ projects }, {
    headers: {
      // ✅ Tells Next.js to check for new projects instead of using an old cache
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}