import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { name?: string; category?: string; photos?: string[] };
  const data = load();
  const event = data.events.find(e => e.id === id);
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });

  if (body.name !== undefined) event.name = body.name;
  if (body.category !== undefined) event.category = body.category;
  if (body.photos !== undefined) event.photos = body.photos;

  save(data);
  return NextResponse.json({ ok: true, event });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = load();
  const eventIndex = data.events.findIndex(e => e.id === id);
  if (eventIndex === -1) return NextResponse.json({ ok: false }, { status: 404 });

  const photoDir = join(process.cwd(), 'public', 'photos', id);
  if (existsSync(photoDir)) {
    rmSync(photoDir, { recursive: true, force: true });
  }

  data.events.splice(eventIndex, 1);
  save(data);
  return NextResponse.json({ ok: true });
}
