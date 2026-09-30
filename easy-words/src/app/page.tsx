import { EasyWordsApp } from '@/components/easy-words-app';
import { getAppConfig } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function Page() { return <EasyWordsApp config={await getAppConfig()} />; }
