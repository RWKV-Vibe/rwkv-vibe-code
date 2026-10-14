import { normalizeApiUrlWithPort } from '@/lib/auth-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** HTML vibe coding 微调好的 state，走真实后端时始终启用 */
// const STATE_ID = 'html_vibe_ctx2048.pth';

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;

  const backendUrl = normalizeApiUrlWithPort(
    typeof payload.apiUrl === 'string' ? payload.apiUrl : '',
  );
  if (!backendUrl) {
    return Response.json({ error: '后端 API 地址无效' }, { status: 400 });
  }

  const backendPayload: Record<string, unknown> = {
    ...payload,
    // state_id: STATE_ID, // 暂时注释：该 state 在当前后端不存在
  };
  delete backendPayload.apiUrl;

  console.log('[chat] ->', backendUrl);
  console.log('[chat] payload:', JSON.stringify(backendPayload, null, 2));

  const backendResponse = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendPayload),
    signal: request.signal,
    cache: 'no-store',
  });

  const headers = new Headers({
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  const contentType = backendResponse.headers.get('Content-Type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers,
  });
}
