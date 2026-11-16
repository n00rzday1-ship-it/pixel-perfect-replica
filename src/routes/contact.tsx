import { createFileRoute } from '@tanstack/react-router';
import { InfoPage, pageHead } from '@/components/info-page';
export const Route = createFileRoute('/contact')({ head: () => pageHead('Contact', 'Contact availability for AVFetch developer Noorzzz.'), component: Page });
function Page() { return <InfoPage title="Let’s talk quality." intro="Designed & Developed by Noorzzz."><section><h2>Contact details coming soon</h2><p>A verified contact address has not been provided yet. No contact form is active in this preview.</p></section></InfoPage>; }