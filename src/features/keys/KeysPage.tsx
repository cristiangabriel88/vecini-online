import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { KeySquare, Plus, ArrowLeftRight } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { useKeysStore } from './keysStore';
import { isValidHandover, isValidKey, searchKeys, sortKeys } from './keysLogic';

export default function KeysPage() {
  const { t } = useTranslation();
  const { keys, add, handover } = useKeysStore();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [space, setSpace] = useState('');
  const [holder, setHolder] = useState('');
  const [notes, setNotes] = useState('');

  const [handoverId, setHandoverId] = useState<string | null>(null);
  const [newHolder, setNewHolder] = useState('');

  const list = sortKeys(searchKeys(keys, query));
  const valid = isValidKey(space, holder);
  const handoverValid = isValidHandover(newHolder);

  const submit = () => {
    if (!valid) return;
    add({ space, holder, notes });
    toast.success(t('keys.added'));
    setOpen(false);
    setSpace('');
    setHolder('');
    setNotes('');
  };

  const submitHandover = () => {
    if (!handoverId || !handoverValid) return;
    handover(handoverId, newHolder);
    toast.success(t('keys.handedOver'));
    setHandoverId(null);
    setNewHolder('');
  };

  return (
    <div>
      <PageHeader
        title={t('keys.title')}
        subtitle={t('keys.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('keys.new')}
          </Button>
        }
      />

      <div className="mb-4">
        <Input placeholder={t('keys.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <EmptyState body={t('keys.empty')} icon={<KeySquare className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {list.map((k) => (
            <Card key={k.id} className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{k.space}</p>
                <p className="text-sm text-text">{t('keys.holder', { name: k.holder_name })}</p>
                {k.notes && <p className="text-sm text-muted">{k.notes}</p>}
              </div>
              <Button variant="ghost" onClick={() => setHandoverId(k.id)}>
                <ArrowLeftRight className="h-4 w-4" /> {t('keys.handover')}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('keys.new')}
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
          <Input label={t('keys.space')} value={space} onChange={(e) => setSpace(e.target.value)} />
          <Input label={t('keys.holderLabel')} value={holder} onChange={(e) => setHolder(e.target.value)} />
          <Textarea label={t('keys.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>

      <Modal
        open={handoverId !== null}
        onClose={() => setHandoverId(null)}
        title={t('keys.handover')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setHandoverId(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitHandover} disabled={!handoverValid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Input label={t('keys.newHolder')} value={newHolder} onChange={(e) => setNewHolder(e.target.value)} />
      </Modal>
    </div>
  );
}
