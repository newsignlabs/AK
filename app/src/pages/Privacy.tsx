import { site } from '../lib/content';

export default function Privacy() {
  return (
    <article className="container prose page-head">
      <p className="eyebrow">Legal</p>
      <h1 className="display">Privacy policy</h1>
      <p className="muted">Last updated: October 2026</p>

      <h2>What we collect</h2>
      <p>
        When you send an enquiry through our quotation or contact forms we collect the details you enter: your name, email,
        phone number, preferred contact method and the information about your shoot. We also record the page you sent it
        from and, if present, campaign parameters in the link you followed.
      </p>

      <h2>Why we collect it</h2>
      <p>Only to reply to your enquiry, prepare a quote and, if you book with us, to plan and deliver your shoot.</p>

      <h2>Where it is stored</h2>
      <p>
        Enquiries are stored securely in our website backend hosted on Zoho Catalyst. Notification emails are sent to the
        studio and a confirmation is sent to you. We never sell or share your details with third parties for marketing.
      </p>

      <h2>How long we keep it</h2>
      <p>Enquiries that don't become bookings are deleted after 24 months. Client records are kept as required by law.</p>

      <h2>WhatsApp and social media</h2>
      <p>
        If you contact us on WhatsApp or follow a link to our social profiles, those services process your data under their
        own privacy policies.
      </p>

      <h2>Analytics and cookies</h2>
      <p>
        We use privacy-friendly, cookieless analytics to understand which pages are useful. The site stores your
        in-progress quotation in your own browser so you don't lose it on refresh; you can clear it at any time.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us to see, correct or delete your data at any time by writing to{' '}
        <a className="text-link" href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </article>
  );
}
