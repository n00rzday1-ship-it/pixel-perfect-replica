import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Clipboard, FileAudio, Film, Link2, Loader2, LockKeyhole, ShieldCheck, Sparkles, X, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlatformIcon } from '@/components/platform-icon';
import { pageHead } from '@/components/info-page';
import { recognizeMedia, mediaError, type Platform } from '@/lib/media';

export const Route = createFileRoute('/')({ head: () => pageHead('AVFetch — Your media. Your quality. Your choice.', 'Analyze authorized media links and choose real available video or audio formats with AVFetch.'), component: Index });
const platforms: Platform[] = ['YouTube', 'Instagram', 'LinkedIn', 'X'];
function Index() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'MP4' | 'MP3'>('MP4');
  const [error, setError] = useState('');
  const [recognized, setRecognized] = useState<Platform | null>(null);
  const [checking, setChecking] = useState(false);
  let detected: Platform | null = null;
  try { detected = recognizeMedia(url).platform; } catch { /* incomplete input */ }
  async function paste() {
    try { const text = await navigator.clipboard.readText(); setUrl(text.slice(0, 2048)); setError(''); setRecognized(null); }
    catch { setError('Clipboard access isn’t available. Paste directly into the link field.'); }
  }
  async function analyze() {
    setError(''); setRecognized(null); setChecking(true);
    try { const result = recognizeMedia(url); setRecognized(result.platform); }
    catch (err) { setError(mediaError(err)); }
    finally { setChecking(false); }
  }
  return <main>
    <section className="workspace"><div className="page-width workspace-inner">
      <div className="text-center"><div className="intro-label flex items-center justify-center gap-2"><Sparkles size={13} /> LET’S FETCH QUALITY.</div>
        <h1 className="main-heading">Your media.<br /><span className="text-primary">Your quality.</span> Your choice.</h1>
        <p className="mx-auto max-w-lg text-sm leading-7 text-muted-foreground">One link. Video or audio. The quality you choose.<br className="hidden sm:block" /> Fetch your authorized media, without the compromise.</p>
      </div>
      <div className="fetch-panel"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div role="tablist" aria-label="Output format" className="format-tabs">{(['MP4', 'MP3'] as const).map(format => <Button key={format} variant="outline" role="tab" aria-selected={mode === format} aria-controls="format-details" onClick={() => setMode(format)}>{format === 'MP4' ? <Film /> : <FileAudio />}{format === 'MP4' ? 'Video' : 'Audio'}<span className="text-[10px] opacity-60">{format}</span></Button>)}</div><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><LockKeyhole size={12} /> Authorized media only</span></div>
        <form onSubmit={e => { e.preventDefault(); void analyze(); }}><label htmlFor="media-url" className="mb-2.5 block text-xs font-medium">Paste your media link</label><div className="url-box"><Link2 size={18} className="shrink-0 text-muted-foreground" /><input id="media-url" type="url" maxLength={2048} value={url} onChange={e => { setUrl(e.target.value); setError(''); setRecognized(null); }} placeholder="https://www.youtube.com/watch?v=..." aria-describedby="url-status" />{url ? <Button type="button" variant="ghost" size="icon" title="Clear link" aria-label="Clear link" onClick={() => { setUrl(''); setError(''); setRecognized(null); }}><X /></Button> : <Button type="button" variant="secondary" onClick={paste} className="px-3"><Clipboard /><span className="hidden sm:inline">Paste</span></Button>}</div>
        <Button type="submit" disabled={checking} className="mt-4 h-12 w-full font-semibold">{checking ? <Loader2 className="animate-spin" /> : <Zap />}{checking ? 'Checking link…' : 'Analyze media'}<ArrowRight /></Button></form>
        <div id="url-status" aria-live="polite">{error && <p role="alert" className="mt-4 flex items-start gap-2 text-xs leading-5 text-destructive"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</p>}{recognized && <div className="mt-5 border-t border-border pt-4"><div className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 size={17} />{recognized} link recognized</div><p className="mt-2 text-xs leading-6 text-muted-foreground">Media analysis for {recognized} is not connected yet. No metadata, quality options, or downloads are available until an authorized integration is configured.</p><Button asChild variant="link" className="mt-1 h-auto px-0"><Link to="/platforms">View platform availability <ArrowRight /></Link></Button></div>}{detected && !recognized && <p className="mt-3 text-xs text-primary">{detected} link detected</p>}</div>
        <div id="format-details" role="tabpanel" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="flex items-center gap-2 text-[10px] text-muted-foreground"><CheckCircle2 size={13} className="text-primary" />{mode === 'MP4' ? 'Original quality. No artificial upscaling.' : 'Output bitrate does not improve source quality.'}</span><div className="flex gap-1.5">{(mode === 'MP4' ? ['MP4', 'SOURCE QUALITY'] : ['MP3', 'AUDIO ONLY']).map(text => <span className="quality-chip" key={text}>{text}</span>)}</div></div>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">{platforms.map(platform => <Link to="/platforms" key={platform} className="flex items-center gap-2 text-[11px] text-muted-foreground"><PlatformIcon platform={platform} />{platform === 'X' ? 'X / Twitter' : platform}</Link>)}</div>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] leading-5 text-muted-foreground"><ShieldCheck size={13} className="shrink-0" />Only download content you own or have permission to save.</p>
    </div></section>
    <section className="border-y border-border"><div className="page-width grid gap-8 py-8 md:grid-cols-3">{[{ icon: Zap, title: 'Less friction. More fetching.', description: 'A direct path from your media link to your preferred format.' }, { icon: Film, title: 'Quality, without compromise.', description: 'Real source formats. Never fake resolutions or upscaled claims.' }, { icon: ShieldCheck, title: 'Your media. Your control.', description: 'Built around permission, privacy, and transparent processing.' }].map(item => <div key={item.title} className="flex gap-4"><div className="feature-icon shrink-0"><item.icon size={18} /></div><div><h3 className="text-sm font-medium">{item.title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p></div></div>)}</div></section>
    <section className="page-width py-12"><div className="flex items-center justify-between gap-4"><div><p className="intro-label">FROM LINK TO LIBRARY</p><h2 className="mt-3 text-2xl font-medium">Three steps. That’s it.</h2></div><Button variant="ghost" asChild className="hidden sm:inline-flex"><Link to="/how-it-works">How it works <ArrowUpRightIcon /></Link></Button></div><div className="mt-7 grid gap-6 sm:grid-cols-3">{[{ title: 'Paste your link', text: 'Start with a video or post you’re authorized to save.' }, { title: 'Make it yours', text: 'Choose video or audio, then an actual available quality.' }, { title: 'Fetch your file', text: 'Download once authorized processing is complete.' }].map((step, i) => <div key={step.title} className="flex gap-4"><span className="brand-title text-2xl text-primary/60">0{i + 1}</span><div><h3 className="text-sm">{step.title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{step.text}</p></div></div>)}</div><p className="mt-8 flex items-center gap-2 text-[10px] text-muted-foreground"><Check size={12} />Frontend preview · Platform integrations and downloads are not yet connected.</p></section>
  </main>;
}
function ArrowUpRightIcon() { return <ArrowRight className="-rotate-45" />; }
