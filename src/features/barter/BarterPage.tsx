import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Repeat2, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { useBarterStore, useAsociatieBarter } from './barterStore';
import { hydrateBarter, saveOffering, leaveOffering } from './barterApi';
import { isValidOffering, searchOfferings } from './barterLogic';

export default function BarterPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useBarterStore((s) => s.fetchError);
  const offerings = useAsociatieBarter();
  const { userId } = useMyIdentity();
  const profileGet = useProfileStore((s) => s.get);
  const mine = offerings.find((o) => o.user_id === userId);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState('');
  const [needs, setNeeds] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateBarter(asociatieId);
  }, [asociatieId]);

  const results = searchOfferings(offerings, query);
  const valid = isValidOffering(offers);

  const openEditor = () => {
    setOffers(mine?.offers ?? '');
    setNeeds(mine?.needs ?? '');
    setOpen(true);
  };

  const submit = () => {
    if (!valid || !asociatieId) return;
    const prof = profileGet(userId ?? '', '');
    const userName = prof.fullName || prof.displayName || 'Rezident';
    const offering = {
      id: mine?.id ?? `sk-${Date.now()}`,
      asociatie_id: asociatieId,
      user_id: userId ?? 'u-res',
      user_name: userName,
      offers: offers.trim(),
      needs: needs.trim(),
    };
    saveOffering(asociatieId, offering);
    toast.success(t('barter.saved'));
    setOpen(false);
  };

  const optOut = () => {
    if (!asociatieId || !userId) return;
    leaveOffering(asociatieId, userId);
    toast.success(t('barter.left'));
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateBarter(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('barter.title')}
        subtitle={t('barter.subtitle')}
        action={
          <Button onClick={openEditor}>
            <Plus className="h-4 w-4" /> {mine ? t('barter.editProfile') : t('barter.addProfile')}
          </Button>
        }
      />

      <Input
        aria-label={t('common.search')}
        placeholder={t('barter.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4"
      />

      {results.length === 0 ? (
        <EmptyState body={t('barter.empty')} icon={<Repeat2 className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((o) => (
            <Card key={o.id} className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{o.user_name}</p>
                {o.user_id === userId && (
                  <Button variant="ghost" onClick={optOut}>
                    {t('barter.leave')}
                  </Button>
                )}
              </div>
              <p className="text-sm text-text">
                <Badge tone="success">{t('barter.offers')}</Badge> {o.offers}
              </p>
              {o.needs && (
                <p className="text-sm text-text">
                  <Badge tone="primary">{t('barter.needs')}</Badge> {o.needs}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mine ? t('barter.editProfile') : t('barter.addProfile')}
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
          <Textarea
            label={t('barter.offers')}
            hint={t('barter.offersHint')}
            value={offers}
            onChange={(e) => setOffers(e.target.value)}
          />
          <Textarea
            label={t('barter.needs')}
            hint={t('barter.needsHint')}
            value={needs}
            onChange={(e) => setNeeds(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
