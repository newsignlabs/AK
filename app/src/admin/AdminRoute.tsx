import { lazy, Suspense, useEffect, useState } from 'react';

const AdminApp = lazy(() => import('./AdminApp'));

/**
 * /admin: client-only. The prerendered page is just a loading shell; the
 * editor chunk (forms, schemas, styles) loads after mount and never ships
 * to regular visitors.
 */
export default function AdminRoute() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const shell = <main className="a-login" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading admin…</main>;
  if (!ready) return shell;
  return (
    <Suspense fallback={shell}>
      <AdminApp />
    </Suspense>
  );
}
