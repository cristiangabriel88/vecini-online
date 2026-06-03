import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Heart, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { formatDateLong } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { useThankYousStore, useAsociatieThankYous } from './thankYousStore';
import { hydrateThankYous, postThankYouLive } from './thankYousApi';
import { isValidThankYou, formatApartmentLabel } from './thankYouLogic';

export default function ThankYousPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useThankYousStore((s) => s.fetchError);
  const items = useAsociatieThankYous();
  const { userId, email } = useMyIdentity();
  const profileGet = useProfileStore((s) => s.get);
  const [open, setOpen] = useState(false);
  const [toApartment, setToApartment] = useState('');
  const [message, setMessage] = useState('');
  const valid = isValidThankYou(message, toApartment);

  useEffect(() => {
    if (asociatieId) void hydrateThankYous(asociatieId);
  }, [asociatieId]);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const profile = profileGet(userId, email);
    const fromName = profile.fullName || profile.displayName || 'Rezident';
    const newItem = {
      id: `ty-${Date.now()}`,
      asociatie_id: asociatieId,
      from_user_id: userId ?? 'u-res',
      from_name: fromName,
      to_apartment: formatApartmentLabel(toApartment),
      message: message.trim(),
      created_at: new Date().toISOString(),
    };
    postThankYouLive(asociatieId, newItem);
    toast.success(t('thankyous.posted'));
    setOpen(false);
    setToApartment('');
    setMessage('');
  };

  const ordered = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateThankYous(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('thankyous.title')}
        subtitle={t('thankyous.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('thankyous.new')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('thankyous.empty')} icon={<Heart className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((ty) => (
            <Card key={ty.id}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-primary">{ty.from_name}</span>
                <Badge tone="success">
                  <Heart className="mr-1 h-3.5 w-3.5" /> {ty.to_apartment}
                </Badge>
              </div>
              <p className="mb-1 whitespace-pre-line text-text">{ty.message}</p>
              <p className="text-sm text-muted">{formatDateLong(ty.created_at)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('thankyous.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.publish')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('thankyous.toApartment')}
            placeholder={t('thankyous.toApartmentHint')}
            value={toApartment}
            onChange={(e) => setToApartment(e.target.value)}
          />
          <Textarea label={t('thankyous.message')} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
