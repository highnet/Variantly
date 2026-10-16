import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';
import { LEGAL_UPDATED, OPERATOR } from '@/lib/legal';

export const metadata: Metadata = { title: 'Privacy policy' };

const Page = () => (
  <LegalPage title="Privacy policy">
    <p>
      This policy explains what personal data this website processes, under the EU General Data
      Protection Regulation (GDPR), the Austrian Data Protection Act (DSG) and the Austrian
      Telecommunications Act 2021 (TKG 2021). In short: no cookies, no analytics, no tracking, no
      ads.
    </p>
    <h2>Controller</h2>
    <p>
      {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}. Email:{' '}
      <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
    </p>
    <h2>Hosting and server logs</h2>
    <p>
      The site is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. When you
      open a page, your browser sends technical data that Vercel records in server logs: IP address,
      date and time, the page requested, referrer, and browser and operating system. This is needed
      to deliver the site and keep it secure (Art. 6 (1) (f) GDPR, legitimate interest). The logs
      are kept only briefly, for the period set by Vercel, and are not used to identify you.
    </p>
    <p>
      Vercel processes this data on our behalf under a data processing agreement. Data may be
      transferred to the USA; Vercel is certified under the EU-US Data Privacy Framework, for which
      the European Commission has issued an adequacy decision (Art. 45 GDPR).
    </p>
    <h2>Settings stored in your browser</h2>
    <p>
      If you change the display settings (theme, readable font, larger text, high contrast, calm
      colours, motion) or pick a package runner for the commands, that choice is saved in your
      browser&rsquo;s local storage so it is still there next time. It never leaves your device and
      is not sent to us. Storing it is strictly necessary for a function you asked for, so no
      consent is required (§ 165 (3) TKG 2021). You can delete it at any time by clearing this
      site&rsquo;s data in your browser.
    </p>
    <p>
      Fonts are served from this website itself. No content is loaded from third parties unless you
      choose to, as described below.
    </p>
    <h2>Demo video (YouTube)</h2>
    <p>
      The demo video is provided by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
      Ireland, in privacy-enhanced mode (youtube-nocookie.com). Nothing is loaded from YouTube until
      you press play. When you do, your IP address and technical data about your browser are sent to
      Google, which may also store information on your device and transfer data to Google LLC in the
      USA (certified under the EU-US Data Privacy Framework). The legal basis is your consent, given
      by pressing play (Art. 6 (1) (a) GDPR, § 165 (3) TKG 2021). You can withdraw it for the future
      by reloading the page and not pressing play again. See{' '}
      <a href="https://policies.google.com/privacy">Google&rsquo;s privacy policy</a>.
    </p>
    <h2>Booking a demo (Calendly)</h2>
    <p>
      &ldquo;Book a live demo&rdquo; is a plain link to Calendly (Calendly LLC, USA). Nothing is
      loaded from Calendly until you click it. Whatever you enter there is processed by Calendly to
      schedule the call and passed to us so we can hold it (Art. 6 (1) (b) GDPR, steps prior to an
      agreement at your request). See{' '}
      <a href="https://calendly.com/legal/privacy-notice">Calendly&rsquo;s privacy notice</a>. We
      delete booking details once they are no longer needed for the call.
    </p>
    <h2>Contacting us by email</h2>
    <p>
      If you email us, we use your address and message only to answer you (Art. 6 (1) (f) GDPR) and
      delete them when the conversation is over, unless the law requires us to keep them.
    </p>
    <h2>Links to other websites</h2>
    <p>
      Links to GitHub, npm and other sites are plain links. Their operators&rsquo; privacy policies
      apply once you follow them.
    </p>
    <h2>Your rights</h2>
    <p>
      You have the right to access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17),
      restriction of processing (Art. 18), data portability (Art. 20) and to object to processing
      based on legitimate interest (Art. 21). You can withdraw consent at any time with effect for
      the future (Art. 7 (3)). To use these rights, email{' '}
      <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
    </p>
    <p>
      If you think the processing of your data breaches data protection law, you can complain to the
      Austrian Data Protection Authority (Österreichische Datenschutzbehörde), Barichgasse 40–42,
      1030 Vienna, <a href="mailto:dsb@dsb.gv.at">dsb@dsb.gv.at</a>,{' '}
      <a href="https://www.dsb.gv.at">www.dsb.gv.at</a>.
    </p>
    <p>
      No automated decision-making or profiling takes place. You are not required to provide any
      personal data to use this website.
    </p>
    <p>Last updated: {LEGAL_UPDATED}</p>
  </LegalPage>
);

export default Page;
