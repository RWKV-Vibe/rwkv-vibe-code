import { validateApiUrlWithPort } from '@/lib/auth-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const STREAM_HEADERS = {
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
} as const;

const jsonError = (message: string, status: number) =>
  Response.json({ error: message }, { status });

const resolveBackendUrl = (payload: Record<string, unknown>): string | null => {
  const fromBody = typeof payload.apiUrl === 'string' ? payload.apiUrl : '';
  const fromEnv = process.env.NEXT_PUBLIC_RWKV_API_URL?.trim() || '';
  const validated = validateApiUrlWithPort(fromBody || fromEnv);
  return validated.ok ? validated.normalizedUrl : null;
};

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('请求体必须是 JSON', 400);
  }

  const backendUrl = resolveBackendUrl(payload);
  if (!backendUrl) {
    return jsonError('后端 API 地址无效', 400);
  }

  const backendPayload = { ...payload };
  delete backendPayload.apiUrl;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
      signal: request.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }
    const message =
      error instanceof Error ? error.message : '无法连接后端';
    return jsonError(`请求后端失败: ${message}`, 502);
  }

  if (!backendResponse.body) {
    const text = await backendResponse.text().catch(() => '');
    return new Response(text, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: {
        'Content-Type':
          backendResponse.headers.get('Content-Type') ??
          'text/plain; charset=utf-8',
      },
    });
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: {
      ...STREAM_HEADERS,
      'Content-Type':
        backendResponse.headers.get('Content-Type') ??
        'text/event-stream; charset=utf-8',
    },
  });
}
