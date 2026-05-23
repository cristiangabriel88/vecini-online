/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { RequireAuth } from './RequireAuth';
import { RequireAsociatie } from './RequireAsociatie';
import { SkeletonList } from '@/shared/components/Skeleton';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const SecurityPage = lazy(() => import('@/features/auth/SecurityPage'));
const PrivacyPolicyPage = lazy(() => import('@/features/legal/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('@/features/legal/TermsPage'));
const CookiePolicyPage = lazy(() => import('@/features/legal/CookiePolicyPage'));
const PrivacySettingsPage = lazy(() => import('@/features/legal/PrivacySettingsPage'));
const ProcessingRecordsPage = lazy(() => import('@/features/legal/ProcessingRecordsPage'));
const OnboardingWizard = lazy(() => import('@/features/onboarding/OnboardingWizard'));
const JoinAsociatiePage = lazy(() => import('@/features/onboarding/JoinAsociatiePage'));
const HomePage = lazy(() => import('@/features/home/HomePage'));
const AnnouncementsPage = lazy(() => import('@/features/announcements/AnnouncementsPage'));
const PollsPage = lazy(() => import('@/features/polls/PollsPage'));
const TicketsPage = lazy(() => import('@/features/tickets/TicketsPage'));
const EventsPage = lazy(() => import('@/features/events/EventsPage'));
const LocatorPage = lazy(() => import('@/features/locator/LocatorPage'));
const FaqPage = lazy(() => import('@/features/faq/FaqPage'));
const IdeasPage = lazy(() => import('@/features/ideas/IdeasPage'));
const SurveysPage = lazy(() => import('@/features/surveys/SurveysPage'));
const LendingPage = lazy(() => import('@/features/lending/LendingPage'));
const BikesPage = lazy(() => import('@/features/bikes/BikesPage'));
const PetsPage = lazy(() => import('@/features/pets/PetsPage'));
const WarrantiesPage = lazy(() => import('@/features/warranties/WarrantiesPage'));
const RepairsPage = lazy(() => import('@/features/repairs/RepairsPage'));
const MetersPage = lazy(() => import('@/features/meters/MetersPage'));
const DirectoryPage = lazy(() => import('@/features/directory/DirectoryPage'));
const ThankYousPage = lazy(() => import('@/features/thankyous/ThankYousPage'));
const GlossaryPage = lazy(() => import('@/features/glossary/GlossaryPage'));
const VisitorsPage = lazy(() => import('@/features/visitors/VisitorsPage'));
const MarketplacePage = lazy(() => import('@/features/marketplace/MarketplacePage'));
const FeedbackPage = lazy(() => import('@/features/feedback/FeedbackPage'));
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage'));
const StoragePage = lazy(() => import('@/features/storage/StoragePage'));
const CarpoolPage = lazy(() => import('@/features/carpool/CarpoolPage'));
const BirthdaysPage = lazy(() => import('@/features/birthdays/BirthdaysPage'));
const EnergyPage = lazy(() => import('@/features/energy/EnergyPage'));
const MultiyearPage = lazy(() => import('@/features/multiyear/MultiyearPage'));
const AccessPage = lazy(() => import('@/features/access/AccessPage'));
const SittersPage = lazy(() => import('@/features/sitters/SittersPage'));
const BarterPage = lazy(() => import('@/features/barter/BarterPage'));
const GroupBuysPage = lazy(() => import('@/features/groupbuys/GroupBuysPage'));
const MaintenancePage = lazy(() => import('@/features/maintenance/MaintenancePage'));
const ParkingPage = lazy(() => import('@/features/parking/ParkingPage'));
const PetitionsPage = lazy(() => import('@/features/petitions/PetitionsPage'));
const CrowdfundPage = lazy(() => import('@/features/crowdfund/CrowdfundPage'));
const RepairFundPage = lazy(() => import('@/features/repairfund/RepairFundPage'));
const PsiPage = lazy(() => import('@/features/psi/PsiPage'));
const InsurancePage = lazy(() => import('@/features/insurance/InsurancePage'));
const KeysPage = lazy(() => import('@/features/keys/KeysPage'));
const EmergencyPage = lazy(() => import('@/features/emergency/EmergencyPage'));
const AlertsPage = lazy(() => import('@/features/alerts/AlertsPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotificationsPage = lazy(() => import('@/features/profile/NotificationsPage'));
const FeaturesAdminPage = lazy(() => import('@/features/admin/FeaturesAdminPage'));
const ApartmentsPage = lazy(() => import('@/features/admin/ApartmentsPage'));
const InvitesAdminPage = lazy(() => import('@/features/invites/InvitesAdminPage'));
const MyDataPage = lazy(() => import('@/features/gdpr/MyDataPage'));
const DsrAdminPage = lazy(() => import('@/features/gdpr/DsrAdminPage'));
const BreachAdminPage = lazy(() => import('@/features/gdpr/BreachAdminPage'));
const AnonymousPage = lazy(() => import('@/features/anonymous/AnonymousPage'));
const PvDocumentsPage = lazy(() => import('@/features/pv/PvDocumentsPage'));
const RfpPage = lazy(() => import('@/features/rfp/RfpPage'));
const DutyPage = lazy(() => import('@/features/duty/DutyPage'));
const GreenSpacePage = lazy(() => import('@/features/greenspace/GreenSpacePage'));
const WikiPage = lazy(() => import('@/features/wiki/WikiPage'));
const ContractorsPage = lazy(() => import('@/features/contractors/ContractorsPage'));
const AlarmPage = lazy(() => import('@/features/alarm/AlarmPage'));
const DiscussionsPage = lazy(() => import('@/features/discussions/DiscussionsPage'));
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage'));
const AgaPage = lazy(() => import('@/features/aga/AgaPage'));
const PrioritiesPage = lazy(() => import('@/features/priorities/PrioritiesPage'));
const LaundryPage = lazy(() => import('@/features/laundry/LaundryPage'));
const MovingPage = lazy(() => import('@/features/moving/MovingPage'));
const VenuePage = lazy(() => import('@/features/venue/VenuePage'));
const AdminChatPage = lazy(() => import('@/features/adminchat/AdminChatPage'));
const WelcomeKitPage = lazy(() => import('@/features/welcomekit/WelcomeKitPage'));
const KidsPage = lazy(() => import('@/features/kids/KidsPage'));
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'));
const PhotoJournalPage = lazy(() => import('@/features/photojournal/PhotoJournalPage'));
const RecurringPage = lazy(() => import('@/features/recurring/RecurringPage'));
const SafetyCodePage = lazy(() => import('@/features/safety/SafetyCodePage'));
const EvacuationPage = lazy(() => import('@/features/evacuation/EvacuationPage'));
const ApartmentInfoPage = lazy(() => import('@/features/apartment/ApartmentInfoPage'));
const NotImplementedPage = lazy(() => import('@/features/home/NotImplementedPage'));
const FeatureHubPage = lazy(() =>
  import('@/features/home/FeatureHubPage').then((m) => ({ default: m.FeatureHubPage })),
);

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SkeletonList rows={4} />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <S><LoginPage /></S> },
  { path: '/reset-parola', element: <S><ResetPasswordPage /></S> },
  { path: '/confidentialitate', element: <S><PrivacyPolicyPage /></S> },
  { path: '/termeni', element: <S><TermsPage /></S> },
  { path: '/cookies', element: <S><CookiePolicyPage /></S> },
  { path: '/onboarding', element: <S><OnboardingWizard /></S> },
  { path: '/onboarding/alatura', element: <S><JoinAsociatiePage /></S> },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <RequireAsociatie>
          <AppLayout />
        </RequireAsociatie>
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
      { path: 'sondaje', element: <S><SurveysPage /></S> },
      { path: 'imprumut', element: <S><LendingPage /></S> },
      { path: 'biciclete', element: <S><BikesPage /></S> },
      { path: 'animale', element: <S><PetsPage /></S> },
      { path: 'garantii', element: <S><WarrantiesPage /></S> },
      { path: 'istoric-reparatii', element: <S><RepairsPage /></S> },
      { path: 'contoare', element: <S><MetersPage /></S> },
      { path: 'sesizari-recurente', element: <S><RecurringPage /></S> },
      { path: 'vecini', element: <S><DirectoryPage /></S> },
      { path: 'multumiri', element: <S><ThankYousPage /></S> },
      { path: 'glosar', element: <S><GlossaryPage /></S> },
      { path: 'vizitatori', element: <S><VisitorsPage /></S> },
      { path: 'marketplace', element: <S><MarketplacePage /></S> },
      { path: 'feedback', element: <S><FeedbackPage /></S> },
      { path: 'documente', element: <S><DocumentsPage /></S> },
      { path: 'furnizori', element: <S><SuppliersPage /></S> },
      { path: 'boxe', element: <S><StoragePage /></S> },
      { path: 'carpool', element: <S><CarpoolPage /></S> },
      { path: 'aniversari', element: <S><BirthdaysPage /></S> },
      { path: 'energie', element: <S><EnergyPage /></S> },
      { path: 'plan-multianual', element: <S><MultiyearPage /></S> },
      { path: 'curier', element: <S><AccessPage /></S> },
      { path: 'babysitting', element: <S><SittersPage /></S> },
      { path: 'barter', element: <S><BarterPage /></S> },
      { path: 'cumparaturi', element: <S><GroupBuysPage /></S> },
      { path: 'mentenanta', element: <S><MaintenancePage /></S> },
      { path: 'parcare', element: <S><ParkingPage /></S> },
      { path: 'petitii', element: <S><PetitionsPage /></S> },
      { path: 'crowdfund', element: <S><CrowdfundPage /></S> },
      { path: 'fond-reparatii', element: <S><RepairFundPage /></S> },
      { path: 'psi', element: <S><PsiPage /></S> },
      { path: 'asigurare', element: <S><InsurancePage /></S> },
      { path: 'chei', element: <S><KeysPage /></S> },
      { path: 'urgenta', element: <S><EmergencyPage /></S> },
      { path: 'alerte', element: <S><AlertsPage /></S> },
      { path: 'anonim', element: <S><AnonymousPage /></S> },
      { path: 'procese-verbale', element: <S><PvDocumentsPage /></S> },
      { path: 'oferte', element: <S><RfpPage /></S> },
      { path: 'garda', element: <S><DutyPage /></S> },
      { path: 'plante', element: <S><GreenSpacePage /></S> },
      { path: 'wiki', element: <S><WikiPage /></S> },
      { path: 'contractori', element: <S><ContractorsPage /></S> },
      { path: 'alarma', element: <S><AlarmPage /></S> },
      { path: 'discutii', element: <S><DiscussionsPage /></S> },
      { path: 'buget', element: <S><BudgetPage /></S> },
      { path: 'aga', element: <S><AgaPage /></S> },
      { path: 'prioritati', element: <S><PrioritiesPage /></S> },
      { path: 'spalatorie', element: <S><LaundryPage /></S> },
      { path: 'lift-mutare', element: <S><MovingPage /></S> },
      { path: 'sala', element: <S><VenuePage /></S> },
      { path: 'mesaje-admin', element: <S><AdminChatPage /></S> },
      { path: 'welcome-kit', element: <S><WelcomeKitPage /></S> },
      { path: 'copii', element: <S><KidsPage /></S> },
      { path: 'proiecte', element: <S><ProjectsPage /></S> },
      { path: 'jurnal-foto', element: <S><PhotoJournalPage /></S> },
      { path: 'cod-siguranta', element: <S><SafetyCodePage /></S> },
      { path: 'evacuare', element: <S><EvacuationPage /></S> },
      { path: 'apartament-info', element: <S><ApartmentInfoPage /></S> },
      { path: 'actiuni', element: <S><FeatureHubPage actions /></S> },
      { path: 'mai-mult', element: <S><FeatureHubPage /></S> },
      { path: 'profil', element: <S><ProfilePage /></S> },
      { path: 'securitate', element: <S><SecurityPage /></S> },
      { path: 'notificari', element: <S><NotificationsPage /></S> },
      { path: 'confidentialitate', element: <S><PrivacySettingsPage /></S> },
      { path: 'datele-mele', element: <S><MyDataPage /></S> },
      { path: 'admin/functionalitati', element: <S><FeaturesAdminPage /></S> },
      { path: 'admin/apartamente', element: <S><ApartmentsPage /></S> },
      { path: 'admin/invitatii', element: <S><InvitesAdminPage /></S> },
      { path: 'admin/cereri-date', element: <S><DsrAdminPage /></S> },
      { path: 'admin/prelucrare-date', element: <S><ProcessingRecordsPage /></S> },
      { path: 'admin/incidente-date', element: <S><BreachAdminPage /></S> },
      { path: '*', element: <S><NotImplementedPage /></S> },
    ],
  },
]);
