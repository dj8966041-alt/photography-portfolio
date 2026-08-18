import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { src: string };
  const data = load();
  const event = data.events.find(e => e.id === id);
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });

  event.photos = event.photos.filter(p => p !== body.src);
  save(data);

  try {
    const filePath = join(process.cwd(), 'public', body.src.replace(/^\//, ''));
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch {
    // file may already be gone
  }

  return NextResponse.json({ ok: true });
}
