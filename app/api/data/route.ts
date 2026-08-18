import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data.json'), 'utf8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ events: [] });
  }
}
