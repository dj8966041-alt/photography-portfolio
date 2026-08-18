import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

const DATA_PATH = join(process.cwd(), 'public', 'data.json');

type PortfolioEvent = { id: string; name: string; category: string; photos: string[] };
type Data = { events: PortfolioEvent[] };

function load(): Data {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf8')) as Data;
  } catch {
    return { events: [] };
  }
}

function save(data: Data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

/** Create a new event */
export async function POST(request: Request) {
  const body = await request.json() as { name: string; category: string };
  const data = load();
  const newEvent: PortfolioEvent = {
    id: randomBytes(6).toString('hex'),
    name: body.name || 'New Event',
    category: body.category || 'concert',
    photos: [],
  };
  data.events.push(newEvent);
  save(data);
  return NextResponse.json({ ok: true, event: newEvent });
}

/** Replace the full events list (for reorder) */
export async function PUT(request: Request) {
  const body = await request.json() as { events: PortfolioEvent[] };
  const data = load();
  data.events = body.events;
  save(data);
  return NextResponse.json({ ok: true });
}
