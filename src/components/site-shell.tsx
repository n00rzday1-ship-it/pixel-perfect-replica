import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/avfetch-logo.png.asset.json';

const navigation = [{ to: '/', label: 'Home' }, { to: '/how-it-works', label: 'How It Works' }, { to: '/platforms', label: 'Platforms' }, { to: '/faq', label: 'FAQ' }] as const;
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header relative z-10"><div className="page-width flex h-full items-center justify-between gap-4">
    <Link to="/" className="flex items-center gap-3" aria-label="AVFetch home"><img src={logo.url} alt="AVFetch logo" className="brand-logo" /><div><span className="brand-title text-2xl font-bold">AV<span className="text-primary">Fetch</span></span><div className="text-[8px] font-semibold text-muted-foreground">AUDIO. VIDEO. QUALITY.</div></div></Link>
    <nav className="desktop-nav flex items-center gap-8 text-xs text-muted-foreground">{navigation.map(item => <Link key={item.to} to={item.to} activeProps={{ className: 'text-primary' }} activeOptions={{ exact: true }}>{item.label}</Link>)}</nav>
    <Button variant="outline" asChild className="desktop-nav"><Link to="/project">GitHub <ArrowUpRight /></Link></Button>
    <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
  </div>{open && <nav className="absolute top-full left-0 flex w-full flex-col gap-1 border-b border-border bg-card p-4 md:hidden">{[...navigation, { to: '/project', label: 'GitHub' } as const].map(item => <Button key={item.to} variant="ghost" asChild className="justify-start"><Link to={item.to} onClick={() => setOpen(false)}>{item.label}</Link></Button>)}</nav>}</header>;
}
export function SiteFooter() {
  return <footer className="border-t border-border"><div className="page-width flex flex-wrap items-center justify-between gap-6 py-8"><div><Link to="/" className="brand-title text-lg font-bold">AV<span className="text-primary">Fetch</span></Link><p className="mt-1 text-[11px] text-muted-foreground">Let’s Fetch Quality.</p></div><nav className="flex flex-wrap gap-x-6 gap-y-3 text-[11px] text-muted-foreground"><Link to="/about">About</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/contact">Contact</Link><Link to="/project">GitHub ↗</Link></nav></div><div className="page-width flex flex-wrap justify-between gap-3 border-t border-border py-5 text-[10px] text-muted-foreground"><span>© 2026 AVFetch. All rights reserved.</span><span>Designed &amp; Developed by <span className="text-foreground">Noorzzz.</span></span></div></footer>;
}