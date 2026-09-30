import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/config';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { outputJsonSchema, validateResult } from '@/lib/result';
export const runtime = 'nodejs';
export const maxDuration = 60;
function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      // Next.js may use an internal hostname in nextUrl behind a proxy.
      const source = new URL(origin);
      if (!['http:', 'https:'].includes(source.protocol) || source.host !== request.headers.get('host')) throw new Error('Origin mismatch');
    } catch { return reply({ error: '이 페이지에서 다시 시도해 주세요.' }, 403); }
  }
  if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: '다시 시도해 주세요.' }, 415);
  // Bound actual bytes, not only the untrusted Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: '말을 입력해 주세요.' }, 400);
  let raw = ''; let bytes = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16000) { await reader.cancel(); return reply({ error: '말이 너무 길어요. 나누어서 들려주세요.' }, 413); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch { return reply({ error: '다시 시도해 주세요.' }, 400); }
  let text: string;
  try {
    const body = JSON.parse(raw);
    if (typeof body.text !== 'string') throw new Error();
    text = body.text.trim();
    if (text.length < 2 || text.length > 2000) throw new Error();
  } catch { return reply({ error: '들은 말을 2자 이상, 2,000자 안으로 입력해 주세요.' }, 400); }
  const config = await getAppConfig();
  if (!config.enabled) return reply({ error: config.notice || '잠시 쉬고 있어요. 조금 뒤에 다시 시도해 주세요.' }, 503);
  if (!process.env.OPENAI_API_KEY) return reply({ error: '아직 서비스 준비 중이에요. 조금 뒤에 다시 와 주세요.' }, 503);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45000), cache: 'no-store',
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', store: false,
        instructions: SYSTEM_PROMPT, input: text, max_output_tokens: 5000,
        text: { format: { type: 'json_schema', name: 'easy_words', strict: true, schema: outputJsonSchema } },
      }),
    });
    if (!response.ok) return reply({ error: response.status === 429 ? '요청이 많아요. 잠시 뒤에 다시 눌러주세요.' : '쉬운 말로 바꾸지 못했어요. 다시 시도해 주세요.' }, response.status === 429 ? 429 : 502);
    const payload = await response.json();
    if (payload.status !== 'completed') throw new Error('Incomplete');
    const content = payload.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content || []) || [];
    if (content.some((item: { type: string }) => item.type === 'refusal')) throw new Error('Refused');
    const answer = content.filter((item: { type: string }) => item.type === 'output_text').map((item: { text: string }) => item.text).join('');
    return reply(validateResult(JSON.parse(answer)));
  } catch {
    // Do not log audio, transcripts, provider responses, or user results.
    return reply({ error: '쉬운 말로 바꾸지 못했어요. 다시 시도해 주세요.' }, 502);
  }
}
