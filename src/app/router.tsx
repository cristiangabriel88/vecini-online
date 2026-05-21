/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { RequireAuth } from './RequireAuth';
import { SkeletonList } from '@/shared/components/Skeleton';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const OnboardingWizard = lazy(() => import('@/features/onboarding/OnboardingWizard'));
const HomePage = lazy(() => import('@/features/home/HomePage'));
const AnnouncementsPage = lazy(() => import('@/features/announcements/AnnouncementsPage'));
const PollsPage = lazy(() => import('@/features/polls/PollsPage'));
const TicketsPage = lazy(() => import('@/features/tickets/TicketsPage'));
const EventsPage = lazy(() => import('@/features/events/EventsPage'));
const LocatorPage = lazy(() => import('@/features/locator/LocatorPage'));
const FaqPage = lazy(() => import('@/features/faq/FaqPage'));
const IdeasPage = lazy(() => import('@/features/ideas/IdeasPage'));
const RepairsPage = lazy(() => import('@/features/repairs/RepairsPage'));
const EmergencyPage = lazy(() => import('@/features/emergency/EmergencyPage'));
const AlertsPage = lazy(() => import('@/features/alerts/AlertsPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotificationsPage = lazy(() => import('@/features/profile/NotificationsPage'));
const FeaturesAdminPage = lazy(() => import('@/features/admin/FeaturesAdminPage'));
const ApartmentsPage = lazy(() => import('@/features/admin/ApartmentsPage'));
const NotImplementedPage = lazy(() => import('@/features/home/NotImplementedPage'));
const FeatureHubPage = lazy(() =>
  import('@/features/home/FeatureHubPage').then((m) => ({ default: m.FeatureHubPage })),
);

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SkeletonList rows={4} />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <S><LoginPage /></S> },
  { path: '/onboarding', element: <S><OnboardingWizard /></S> },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <S><HomePage /></S> },
      { path: 'anunturi', element: <S><AnnouncementsPage /></S> },
      { path: 'voturi', element: <S><PollsPage /></S> },
      { path: 'sesizari', element: <S><TicketsPage /></S> },
      { path: 'evenimente', element: <S><EventsPage /></S> },
      { path: 'locator', element: <S><LocatorPage /></S> },
      { path: 'faq', element: <S><FaqPage /></S> },
      { path: 'idei', element: <S><IdeasPage /></S> },
      { path: 'istoric-reparatii', element: <S><RepairsPage /></S> },
      { path: 'urgenta', element: <S><EmergencyPage /></S> },
      { path: 'alerte', element: <S><AlertsPage /></S> },
      { path: 'actiuni', element: <S><FeatureHubPage actions /></S> },
      { path: 'mai-mult', element: <S><FeatureHubPage /></S> },
      { path: 'profil', element: <S><ProfilePage /></S> },
      { path: 'notificari', element: <S><NotificationsPage /></S> },
      { path: 'admin/functionalitati', element: <S><FeaturesAdminPage /></S> },
      { path: 'admin/apartamente', element: <S><ApartmentsPage /></S> },
      { path: '*', element: <S><NotImplementedPage /></S> },
    ],
  },
]);
