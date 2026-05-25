/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { SkeletonList } from '@/shared/components/Skeleton';
import { RequirePlatformAdmin } from './RequirePlatformAdmin';
import { PlatformLayout } from './PlatformLayout';

const PlatformLoginPage = lazy(() => import('./PlatformLoginPage'));
const PlatformHomePage = lazy(() => import('./PlatformHomePage'));
const PlatformAsociatiiPage = lazy(() => import('./PlatformAsociatiiPage'));

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SkeletonList rows={4} />}>{children}</Suspense>;
}

// Hash routing keeps every platform route a fragment on top of `platform.html`,
// so a refresh always re-serves the platform file itself rather than the static
// host's SPA fallback (the resident/admin `index.html`). This both fixes refresh
// on a single dev origin and keeps the superadmin app fully decoupled from the
// resident/admin path space (it shares the origin only as a separate file).
export const platformRouter = createHashRouter([
  { path: '/', element: <S><PlatformLoginPage /></S> },
  {
    path: '/consola',
    element: (
      <RequirePlatformAdmin>
        <PlatformLayout />
      </RequirePlatformAdmin>
    ),
    children: [
      { index: true, element: <S><PlatformHomePage /></S> },
      { path: 'asociatii', element: <S><PlatformAsociatiiPage /></S> },
    ],
  },
  // The remaining console pages (audit, errors, usage, impersonation, messenger)
  // mount under /consola as they land (T95-T99). Until then any unknown path
  // returns to the overview rather than a dead end.
  { path: '*', element: <Navigate to="/consola" replace /> },
]);
