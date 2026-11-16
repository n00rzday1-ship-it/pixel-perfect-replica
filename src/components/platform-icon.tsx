import { Instagram, Linkedin, Youtube } from 'lucide-react';
import type { Platform } from '@/lib/media';
export function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === 'YouTube') return <Youtube size={22} className="platform-youtube" />;
  if (platform === 'Instagram') return <Instagram size={21} className="platform-instagram" />;
  if (platform === 'LinkedIn') return <Linkedin size={20} className="platform-linkedin" />;
  return <span className="text-xl font-medium" aria-hidden="true">𝕏</span>;
}