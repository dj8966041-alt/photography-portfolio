import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = load();
  const event = data.events.find(e => e.id === id);
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll('photos') as File[];

  const photoDir = join(process.cwd(), 'public', 'photos', id);
  mkdirSync(photoDir, { recursive: true });

  const added: string[] = [];

  for (const file of files) {
    const ext = extname(file.name) || '.jpg';
    const filename = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(photoDir, filename), buffer);
    added.push(`/photos/${id}/${filename}`);
  }

  event.photos.push(...added);
  save(data);

  return NextResponse.json({ ok: true, added });
}
