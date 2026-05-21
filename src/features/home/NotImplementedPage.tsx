import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { FEATURES } from '@/shared/features/registry';

/** Shown for features that are registered and toggleable but whose full page
 *  is not part of this build. The feature still appears in admin toggles and
 *  navigation so the asociație can plan rollout. */
export default function NotImplementedPage() {
  const { t } = useTranslation();
  const { '*': rest } = useParams();
  const path = (rest ?? '').split('/')[0];
  const feature = FEATURES.find((f) => f.path === path);

  return (
    <div>
      <PageHeader title={feature?.title ?? 'Funcționalitate'} />
      <EmptyState
        icon={<Construction className="h-10 w-10" />}
        title={feature ? `${feature.key} · ${feature.title}` : undefined}
        body={t('common.notImplemented')}
      />
    </div>
  );
}
