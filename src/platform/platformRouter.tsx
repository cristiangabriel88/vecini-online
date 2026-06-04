/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RouteFallback } from '@/shared/components/RouteFallback';
import { RequirePlatformAdmin } from './RequirePlatformAdmin';
import { PlatformLayout } from './PlatformLayout';

const PlatformLoginPage = lazy(() => import('./PlatformLoginPage'));
const PlatformHomePage = lazy(() => import('./PlatformHomePage'));
const PlatformAsociatiiPage = lazy(() => import('./PlatformAsociatiiPage'));
const PlatformAddAsociatiePage = lazy(() => import('./PlatformAddAsociatiePage'));
const PlatformAuditPage = lazy(() => import('./PlatformAuditPage'));
const PlatformErrorsPage = lazy(() => import('./PlatformErrorsPage'));

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
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
    children: [
      { index: true, element: <S><PlatformHomePage /></S> },
      { path: 'asociatii', element: <S><PlatformAsociatiiPage /></S> },
      { path: 'asociatii/adauga', element: <S><PlatformAddAsociatiePage /></S> },
      { path: 'audit', element: <S><PlatformAuditPage /></S> },
      { path: 'erori', element: <S><PlatformErrorsPage /></S> },
    ],
  },
  // The remaining console pages (usage, impersonation, messenger)
  // mount under /consola as they land (T97-T99). Until then any unknown path
  // returns to the overview rather than a dead end.
  { path: '*', element: <Navigate to="/consola" replace /> },
]);
