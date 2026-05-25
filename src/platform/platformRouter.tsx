/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SkeletonList } from '@/shared/components/Skeleton';
import { RequirePlatformAdmin } from './RequirePlatformAdmin';
import { PlatformLayout } from './PlatformLayout';

const PlatformLoginPage = lazy(() => import('./PlatformLoginPage'));
const PlatformHomePage = lazy(() => import('./PlatformHomePage'));

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SkeletonList rows={4} />}>{children}</Suspense>;
}

export const platformRouter = createBrowserRouter([
  { path: '/', element: <S><PlatformLoginPage /></S> },
  {
    path: '/consola',
    element: (
      <RequirePlatformAdmin>
        <PlatformLayout />
      </RequirePlatformAdmin>
    ),
    children: [{ index: true, element: <S><PlatformHomePage /></S> }],
  },
  // The console pages (asociații, audit, errors, usage, impersonation, messenger)
  // mount under /consola as they land (T94-T99). Until then any unknown path
  // returns to the overview rather than a dead end.
  { path: '*', element: <Navigate to="/consola" replace /> },
]);
