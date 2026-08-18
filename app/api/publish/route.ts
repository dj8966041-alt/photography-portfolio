import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Push to GitHub
    const pushCmd = 'git add -A && (git diff --cached --quiet || git commit -m "Update portfolio") && git push';
    await execAsync(pushCmd, { cwd: process.cwd() });

    // Deploy to Vercel production and re-alias the domain
    const deployCmd = 'npx vercel --prod --yes 2>&1 | tail -5';
    const { stdout } = await execAsync(deployCmd, { cwd: process.cwd() });

    // Extract the deployment URL and alias the domain
    const match = stdout.match(/https:\/\/photography-portfolio-\S+\.vercel\.app/);
    if (match) {
      const deployUrl = match[0];
      await execAsync(`npx vercel alias set ${deployUrl} diegojauregui.com`, { cwd: process.cwd() });
      await execAsync(`npx vercel alias set ${deployUrl} www.diegojauregui.com`, { cwd: process.cwd() });
    }

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
