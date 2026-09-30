import { CalendarDays, Clock3, MapPin, Backpack, Banknote, TriangleAlert, ListChecks } from 'lucide-react';
import type { EasyResult } from '@/lib/result';
export function ResultCards({ result }: { result: EasyResult }) {
  if (result.uncertain) return <section className="warning" role="alert"><TriangleAlert size={32} aria-hidden="true" /><h2>정확하게 듣지 못했어요</h2><p>{result.uncertain_text}</p></section>;
  const info = [
    { title: '날짜', text: result.date, Icon: CalendarDays }, { title: '시간', text: result.time, Icon: Clock3 },
    { title: '장소', text: result.location, Icon: MapPin }, { title: '준비물', text: result.items.join(', '), Icon: Backpack },
    { title: '돈', text: result.money, Icon: Banknote },
  ].filter(item => item.text);
  return <>
    <section className="easy-card" aria-labelledby="easy-title"><span className="eyebrow">쉽게 말하면</span><h2 id="easy-title" className="sr-only">쉽게 말하면</h2><div className="easy-lines">{result.easy_text.map((line, index) => <p key={index}>{line}</p>)}</div></section>
    {result.actions.length > 0 && <section className="action-card"><h2><ListChecks size={25} aria-hidden="true" /> 내가 해야 할 일</h2><ol>{result.actions.map((action, i) => <li key={i}><span aria-hidden="true">{i + 1}</span>{action}</li>)}</ol></section>}
    {info.length > 0 && <div className="info-grid">{info.map(({ title, text, Icon }) => <section className="info-card" key={title}><h2><Icon size={24} aria-hidden="true" />{title}</h2><p>{text}</p></section>)}</div>}
    {result.warning && <section className="warning"><h2><TriangleAlert size={24} aria-hidden="true" /> 주의할 점</h2><p>{result.warning}</p></section>}
  </>;
}
