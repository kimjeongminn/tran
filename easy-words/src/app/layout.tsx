import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '쉬운 말 · 어려운 말을 쉽게', description: '들은 말을 쉬운 한국어로 바꿔드려요. 큰 글씨로 보고, 천천히 들어보세요.', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2458d3' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
