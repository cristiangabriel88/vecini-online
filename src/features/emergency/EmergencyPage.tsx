import { useTranslation } from 'react-i18next';
import { Phone, PhoneCall } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { DEMO_EMERGENCY } from '@/shared/demo/demoData';

export default function EmergencyPage() {
  const { t } = useTranslation();
  const contacts = [...DEMO_EMERGENCY].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader title={t('emergency.title')} />
      {contacts.length === 0 ? (
        <EmptyState body={t('emergency.empty')} icon={<PhoneCall className="h-10 w-10" />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.label}</p>
                  <p className="text-muted">{c.phone}</p>
                </div>
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} aria-label={`${t('emergency.call')} ${c.label}`}>
                  <Button size="sm">
                    <Phone className="h-4 w-4" /> {t('emergency.call')}
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
