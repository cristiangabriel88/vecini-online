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
const PlatformUsagePage = lazy(() => import('./PlatformUsagePage'));
const PlatformImpersonatePage = lazy(() => import('./PlatformImpersonatePage'));
const PlatformMessengerPage = lazy(() => import('./PlatformMessengerPage'));
const PlatformSubscriptionsPage = lazy(() => import('./PlatformSubscriptionsPage'));

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
      { path: 'utilizare', element: <S><PlatformUsagePage /></S> },
      { path: 'impersonare', element: <S><PlatformImpersonatePage /></S> },
      { path: 'mesaje', element: <S><PlatformMessengerPage /></S> },
      { path: 'abonamente', element: <S><PlatformSubscriptionsPage /></S> },
    ],
  },
  // Any unknown path returns to the overview rather than a dead end.
  { path: '*', element: <Navigate to="/consola" replace /> },
]);
