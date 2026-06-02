import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ScrollText, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { recordAudit } from '@/shared/store/auditStore';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { findVoterApartmentId } from '@/features/polls/pollLogic';
import { createPetition, hydratePetitions, signPetition } from './petitionApi';
import { usePetitionStore, useAsociatiePetitions } from './petitionStore';
import {
  isThresholdReached,
  isValidPetition,
  newPetition,
  progress,
  sortPetitions,
  thresholdCount,
} from './petitionLogic';

export default function PetitionsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.profile?.id ?? null);
  const apartments = useAsociatieApartments();
  const apartmentId = userId ? findVoterApartmentId(apartments, userId) : null;

  const catalog = useAsociatiePetitions();
  const mySigned = usePetitionStore((s) => s.mySigned);
  const fetchError = usePetitionStore((s) => s.fetchError);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (asociatieId) {
      void hydratePetitions(asociatieId, apartments.length || 1);
    }
  }, [asociatieId, apartments.length]);

  const list = sortPetitions(catalog.items);
  const valid = isValidPetition(title, body);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const petition = newPetition(
      { title, body },
      asociatieId,
      userId ?? 'u-res',
      useAuthStore.getState().profile?.full_name ?? 'Resident',
      apartments.length || 1,
    );
    createPetition(asociatieId, petition, userId);
    recordAudit({ action: 'petition.created', entity: 'petition', entity_label: title.trim() });
    toast.success(t('petitions.created'));
    setOpen(false);
    setTitle('');
    setBody('');
  };

  const onSign = (id: string) => {
    if (!asociatieId) return;
    signPetition(asociatieId, id, apartmentId);
    toast.success(t('petitions.signed'));
  };

  if (fetchError) {
    return (
      <div>
        <PageHeader title={t('petitions.title')} subtitle={t('petitions.subtitle')} />
        <ErrorState
          body={t('common.loadError')}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                if (asociatieId) void hydratePetitions(asociatieId, apartments.length || 1);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('petitions.title')}
        subtitle={t('petitions.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('petitions.new')}
          </Button>
        }
      />

      {list.length === 0 ? (
        <EmptyState body={t('petitions.empty')} icon={<ScrollText className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {list.map((p) => {
            const isSigned = mySigned[p.id] ?? false;
            const reached = isThresholdReached(p);
            const target = thresholdCount(p);
            return (
              <Card key={p.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{p.title}</p>
                  {reached ? (
                    <Badge tone="success">{t('petitions.forwarded')}</Badge>
                  ) : (
                    <Badge tone="primary">{t('petitions.open')}</Badge>
                  )}
                </div>
                <p className="text-sm text-text">{p.body}</p>
                <p className="text-xs text-muted">{t('petitions.by', { name: p.author_name })}</p>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(progress(p) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-2 overflow-hidden rounded-full bg-border"
                >
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.round(progress(p) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-sm text-muted">
                    {t('petitions.signatures', { n: p.signatures, target })}
                  </span>
                  <Button
                    variant={isSigned ? 'ghost' : 'primary'}
                    disabled={isSigned || reached}
                    onClick={() => onSign(p.id)}
                  >
                    {isSigned ? t('petitions.signedLabel') : t('petitions.sign')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('petitions.new')}
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
          <Input label={t('petitions.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label={t('petitions.body')} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
