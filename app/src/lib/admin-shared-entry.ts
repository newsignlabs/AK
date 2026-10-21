// Entry bundled into functions/admin/lib/shared.js: the same content rules the
// site is built against, so the admin function can refuse edits that would break it.
export { validateBundle, BUNDLE_KEYS, CONTENT_PATHS, ORIGINALS_DIR } from './content-schema';
