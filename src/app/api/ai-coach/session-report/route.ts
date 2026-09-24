// src/app/api/ai-coach/session-report/route.ts
import { getCurrentUser } from '@/lib/auth';
import { generateSessionReport, AICoachError } from '@/lib/ai/service';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Please log in again.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return Response.json({ error: 'A valid sessionId is required.' }, { status: 400 });
  }

  try {
    const report = await generateSessionReport(user.id, sessionId);
    return Response.json({ reportId: report.id });
  } catch (err) {
    if (err instanceof AICoachError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error('AI coach report failed:', err);
    return Response.json({ error: 'Something went wrong generating feedback.' }, { status: 500 });
  }
}
