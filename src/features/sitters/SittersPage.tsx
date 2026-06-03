import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Baby, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { useSitterStore, useAsociatieSitters } from './sitterStore';
import { hydrateSitters, saveSitterProfile, leaveSitterProfile } from './sitterApi';
import { SITTER_KINDS, isValidSitter, searchSitters } from './sitterLogic';

export default function SittersPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useSitterStore((s) => s.fetchError);
  const profiles = useAsociatieSitters();
  const { userId } = useMyIdentity();
  const profileGet = useProfileStore((s) => s.get);
  const mine = profiles.find((p) => p.user_id === userId);

  const [kindFilter, setKindFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>(SITTER_KINDS[0]);
  const [availability, setAvailability] = useState('');
  const [rate, setRate] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateSitters(asociatieId);
  }, [asociatieId]);

  const results = searchSitters(profiles, kindFilter, query);
  const valid = isValidSitter(availability);

  const openEditor = () => {
    setKind(mine?.kind ?? SITTER_KINDS[0]);
    setAvailability(mine?.availability ?? '');
    setRate(mine?.rate ?? '');
    setOpen(true);
  };

  const submit = () => {
    if (!valid || !asociatieId) return;
    const prof = profileGet(userId ?? '', '');
    const userName = prof.fullName || prof.displayName || 'Rezident';
    const profile = {
      id: mine?.id ?? `st-${Date.now()}`,
      asociatie_id: asociatieId,
      user_id: userId ?? 'u-res',
      user_name: userName,
      kind,
      availability: availability.trim(),
      rate: rate.trim(),
    };
    saveSitterProfile(asociatieId, profile);
    toast.success(t('sitters.saved'));
    setOpen(false);
  };

  const optOut = () => {
    if (!asociatieId || !userId) return;
    leaveSitterProfile(asociatieId, userId);
    toast.success(t('sitters.left'));
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateSitters(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('sitters.title')}
        subtitle={t('sitters.subtitle')}
        action={
          <Button onClick={openEditor}>
            <Plus className="h-4 w-4" /> {mine ? t('sitters.editProfile') : t('sitters.addProfile')}
          </Button>
        }
      />

      {mine && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <Badge tone="primary">{t(`sitters.kind_${mine.kind}`)}</Badge>
            <p className="text-sm text-text">{mine.availability}</p>
            {mine.rate && <p className="text-sm text-muted">{mine.rate}</p>}
          </div>
          <Button variant="ghost" onClick={optOut}>
            {t('sitters.leave')}
          </Button>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label={t('common.search')}
          placeholder={t('sitters.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select aria-label={t('sitters.kind')} value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
          <option value="all">{t('common.all')}</option>
          {SITTER_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`sitters.kind_${k}`)}
            </option>
          ))}
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('sitters.empty')} icon={<Baby className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((p) => (
            <Card key={p.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{p.user_name}</p>
                <Badge tone="neutral">{t(`sitters.kind_${p.kind}`)}</Badge>
              </div>
              <p className="text-sm text-text">{p.availability}</p>
              {p.rate && <p className="text-sm text-muted">{p.rate}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mine ? t('sitters.editProfile') : t('sitters.addProfile')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label={t('sitters.kind')} value={kind} onChange={(e) => setKind(e.target.value)}>
            {SITTER_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`sitters.kind_${k}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t('sitters.availability')}
            hint={t('sitters.availabilityHint')}
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          />
          <Input
            label={t('sitters.rate')}
            hint={t('sitters.rateHint')}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
