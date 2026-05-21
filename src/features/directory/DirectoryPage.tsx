import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Contact, Phone, Mail, DoorOpen } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Switch } from '@/shared/components/Switch';
import { EmptyState } from '@/shared/components/EmptyState';
import { useDirectoryStore } from './directoryStore';
import { searchDirectory } from './directoryLogic';

const FIELDS = ['show_name', 'show_apartment', 'show_phone', 'show_email'] as const;

export default function DirectoryPage() {
  const { t } = useTranslation();
  const { entries, myId, toggle } = useDirectoryStore();
  const [query, setQuery] = useState('');
  const me = entries.find((e) => e.id === myId)!;
  const others = searchDirectory(
    entries.filter((e) => e.id !== myId),
    query,
  );

  return (
    <div>
      <PageHeader title={t('directory.title')} subtitle={t('directory.subtitle')} />

      <Card title={t('directory.myConsent')} className="mb-5">
        <p className="mb-3 text-sm text-muted">{t('directory.consentHint')}</p>
        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f} className="flex items-center justify-between">
              <span>{t(`directory.${f}`)}</span>
              <Switch checked={me[f]} onChange={() => toggle(f)} label={t(`directory.${f}`)} />
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-4">
        <Input
          aria-label={t('common.search')}
          placeholder={t('directory.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {others.length === 0 ? (
        <EmptyState body={t('directory.empty')} icon={<Contact className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {others.map((v) => (
            <Card key={v.id} className="p-4">
              <p className="font-semibold">{v.name}</p>
              <div className="mt-1 space-y-1 text-sm text-muted">
                {v.apartment && (
                  <p className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4" /> {v.apartment}
                  </p>
                )}
                {v.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${v.phone.replace(/\s/g, '')}`} className="text-primary">
                      {v.phone}
                    </a>
                  </p>
                )}
                {v.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${v.email}`} className="text-primary">
                      {v.email}
                    </a>
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
