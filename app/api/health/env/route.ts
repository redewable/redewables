import { NextResponse } from 'next/server';

// This list must match exactly what you have in Vercel
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SOLANA_AUTHORITY_SECRET_KEY',
  'RDW_TREASURY_SECRET_KEY',
  'SOLANA_FEEPAYER_SECRET_KEY',
] as const;

export async function GET() {
  try {
    const status = REQUIRED_VARS.map((name) => {
      const value = process.env[name];
      const isPresent = !!(value && value.trim().length > 0);
      
      return {
        name,
        present: isPresent,
        // ✅ SECURITY: Removed 'sample' and 'length'. 
        // Just return if it exists or not.
      };
    });

    const missing = status.filter((r) => !r.present).map((r) => r.name);

    return NextResponse.json({
      ok: missing.length === 0,
      timestamp: new Date().toISOString(),
      missing: missing.length > 0 ? missing : "none",
      env: status,
    }, {
      // ✅ React 19 / Next.js 15: Ensure this isn't cached
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to check environment" }, { status: 500 });
  }
}