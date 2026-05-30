import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ScrollText, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { recordAudit } from '@/shared/store/auditStore';
import { usePetitionStore } from './petitionStore';
import {
  isThresholdReached,
  isValidPetition,
  progress,
  sortPetitions,
  thresholdCount,
} from './petitionLogic';

export default function PetitionsPage() {
  const { t } = useTranslation();
  const { petitions, signed, create, sign } = usePetitionStore();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const list = sortPetitions(petitions);
  const valid = isValidPetition(title, body);

  const submit = () => {
    if (!valid) return;
    create({ title, body });
    recordAudit({ action: 'petition.created', entity: 'petition', entity_label: title.trim() });
    toast.success(t('petitions.created'));
    setOpen(false);
    setTitle('');
    setBody('');
  };

  const onSign = (id: string) => {
    sign(id);
    toast.success(t('petitions.signed'));
  };

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
            const isSigned = signed.includes(p.id);
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
                <div className="h-2 overflow-hidden rounded-full bg-border">
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
                    disabled={isSigned}
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
