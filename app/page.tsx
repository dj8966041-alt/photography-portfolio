import { readFileSync } from 'fs';
import { join } from 'path';
import HomeClient, { type PortfolioEvent } from './HomeClient';

function getEvents(): PortfolioEvent[] {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data.json'), 'utf8');
    const data = JSON.parse(raw) as { events: PortfolioEvent[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default function Page() {
  const events = getEvents();
  return <HomeClient events={events} />;
}
