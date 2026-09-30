import { unstable_cache } from 'next/cache';
import { z } from 'zod';
const schema = z.object({ v: z.number().int().positive(), enabled: z.boolean(), notice: z.string().max(160).optional() });
const defaults: z.infer<typeof schema> = { v: 1, enabled: true };
// Only this tiny public node is read. Never read the database root or open a listener.
export const getAppConfig = unstable_cache(async () => {
  const root = process.env.FIREBASE_DATABASE_URL;
  if (!root) return defaults;
  try {
    const url = new URL(root);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)?\.(firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname)) throw new Error('Invalid Firebase URL');
    url.pathname = '/public/app.json'; url.search = ''; url.hash = '';
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('Config unavailable');
    return schema.parse(await response.json());
  } catch {
    // Configured database failing must not bypass an operator's disabled switch.
    return { v: 1, enabled: false, notice: '지금은 잠시 사용할 수 없어요. 조금 뒤에 다시 와 주세요.' };
  }
}, ['public-app-config-v1'], { revalidate: 300 });
