'use strict';

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const wrap = (inner) => `<!doctype html><html><body style="margin:0;background:#FAFAF8;font-family:Helvetica,Arial,sans-serif;color:#111;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">${inner}</div></body></html>`;

const table = (rows) =>
  `<table style="width:100%;border-collapse:collapse;font-size:14px;">${rows
    .filter(([, v]) => v !== '' && v != null)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #E6E6E2;color:#6F6F6B;vertical-align:top;width:38%;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #E6E6E2;white-space:pre-wrap;">${esc(v)}</td></tr>`,
    )
    .join('')}</table>`;

function quoteRows(d, pricing) {
  return [
    ['Service', pricing.services[d.service].label],
    ['Date', d.dateFlexible || !d.date ? 'Not fixed yet' : d.date],
    ['Location', [pricing.locationMultiplier[d.locationType].label, d.city].filter(Boolean).join(' · ')],
    ['Duration', `${d.hours} h`],
    [pricing.services[d.service].unitLabel, String(d.units)],
    ['Edited photos', String(d.editedPhotos)],
    ['Album', pricing.albums[d.album].label],
    ['Add-ons', d.addons.map((a) => pricing.addons[a].label).join(', ') || 'None'],
    ['Budget', pricing.budgets[d.budget]],
    ['Brief', d.notes],
    ['References', d.references],
  ];
}

function studioEmail({ enquiry, ref, estText, replyWa, pricing }) {
  const d = enquiry.data;
  const contact = [
    ['Name', d.name],
    ['Email', d.email],
    ['Phone', d.phone],
    ['Prefers', enquiry.type === 'quote' ? d.preferredContact : 'email'],
  ];
  const body =
    enquiry.type === 'quote'
      ? table([...quoteRows(d, pricing), ['Estimate', estText || 'Custom quote']])
      : table([['Subject', d.subject], ['Message', d.message]]);
  return wrap(`
    <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6F6F6B;">New ${enquiry.type === 'quote' ? 'quote request' : 'message'} · ${esc(ref)}</p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:8px 0 24px;">${esc(d.name)}</h1>
    ${table(contact)}
    <div style="height:24px"></div>
    ${body}
    <p style="margin-top:24px;">
      <a href="mailto:${esc(d.email)}?subject=${encodeURIComponent(`Re: ${ref}`)}" style="color:#111;">Reply by email</a>
      ${replyWa ? ` &nbsp;·&nbsp; <a href="${esc(replyWa)}" style="color:#111;">Reply on WhatsApp</a>` : ''}
    </p>
    <p style="font-size:12px;color:#6F6F6B;">Source: ${esc(enquiry.sourcePage || '—')} ${enquiry.utm ? '· ' + esc(enquiry.utm) : ''}</p>`);
}

function clientEmail({ enquiry, ref, estText, pricing, site }) {
  const d = enquiry.data;
  const first = d.name.split(' ')[0];
  const summary =
    enquiry.type === 'quote'
      ? table([...quoteRows(d, pricing), ...(pricing.showPrices ? [['Indicative estimate', estText || 'Custom quote']] : [])])
      : table([['Subject', d.subject], ['Message', d.message]]);
  return wrap(`
    <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6F6F6B;">${esc(site.name)} · ${esc(ref)}</p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:8px 0 16px;">Thank you, ${esc(first)}.</h1>
    <p style="line-height:1.6;">We've received your ${enquiry.type === 'quote' ? 'quote request' : 'message'} and will reply within 24 hours.</p>
    ${summary}
    ${enquiry.type === 'quote' && pricing.showPrices ? `<p style="font-size:13px;color:#6F6F6B;">${esc(pricing.note)}</p>` : ''}
    <p style="margin-top:24px;line-height:1.6;">Need us sooner? Reply to this email or message us on
      <a href="https://wa.me/${esc(site.whatsapp.number)}" style="color:#111;">WhatsApp</a>.</p>
    <p style="font-size:12px;color:#6F6F6B;margin-top:32px;">${esc(site.name)} · ${esc(site.address.city)} · ${esc(site.url)}</p>`);
}

module.exports = { studioEmail, clientEmail, esc };
