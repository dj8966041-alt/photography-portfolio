import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import EventClient from './EventClient';
import { type PortfolioEvent } from '../../HomeClient';

function getEvent(id: string): PortfolioEvent | null {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data.json'), 'utf8');
    const data = JSON.parse(raw) as { events: PortfolioEvent[] };
    return data.events.find(e => e.id === id) ?? null;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) notFound();
  return <EventClient event={event} />;
}
