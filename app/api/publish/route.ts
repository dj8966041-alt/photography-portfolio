import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const cmd = 'git add -A && (git diff --cached --quiet || git commit -m "Update portfolio") && git push';
    await execAsync(cmd, { cwd: process.cwd() });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    const msg = error.stderr || error.message || 'Unknown error';
    if (msg.includes('nothing to commit') || msg.includes('up-to-date') || msg.includes('up to date')) {
      return NextResponse.json({ ok: true });
    }
    console.error('Publish error:', msg);
    return NextResponse.json({ ok: false, message: 'Push failed — check terminal for details.' });
  }
}
