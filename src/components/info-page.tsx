import type { ReactNode } from 'react';
export function InfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <main className="page-width info-page"><span className="intro-label">AVFETCH / AUDIO. VIDEO. QUALITY.</span><h1 className="mt-5">{title}</h1><p>{intro}</p><div className="mt-10 space-y-8">{children}</div></main>;
}
export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} · AVFetch` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · AVFetch` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}