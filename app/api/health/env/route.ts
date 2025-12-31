import { NextResponse } from 'next/server';

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SOLANA_AUTHORITY_SECRET_KEY',
  'RDW_TREASURY_SECRET_KEY',
  'SOLANA_FEEPAYER_SECRET_KEY',
] as const;

export async function GET() {
  const result = REQUIRED.map((name) => {
    const v = process.env[name];
    return {
      name,
      present: !!(v && v.trim().length > 0),
      // never leak full secrets:
      sample: v ? `${v.slice(0, 4)}…${v.slice(-4)}` : null,
      length: v?.length ?? 0,
    };
  });

  const missing = result.filter((r) => !r.present).map((r) => r.name);

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
    vars: result,
  });
}