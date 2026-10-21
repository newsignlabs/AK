'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { createHandler, createPricingSource } = require('./handler');

const TABLE = 'Enquiries';

const handle = createHandler({
  env: process.env,
  fetch: globalThis.fetch,
  loadPricing: createPricingSource({ url: process.env.PRICING_URL, fetch: globalThis.fetch }),
  services(req) {
    const app = catalyst.initialize(req);
    const segment = app.cache().segment();
    return {
      insertRow: (row) => app.datastore().table(TABLE).insertRow(row),
      sendMail: (mail) => app.email().sendMail(mail),
      cacheGet: (key) => segment.getValue(key),
      cachePut: (key, value, hours) => segment.put(key, value, hours),
    };
  },
});

// Advanced I/O entry point: POST /server/enquiry/
module.exports = (req, res) => {
  handle(req, res).catch((err) => {
    console.error('enquiry: unhandled error', err && err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal' }));
    }
  });
};
