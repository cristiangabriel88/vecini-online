import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';

export default function NotificationsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('nav.notifications')} />
      <EmptyState
        icon={<Bell className="h-10 w-10" />}
        body={t('notifications.empty')}
      />
    </div>
  );
}
