import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileSignature, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { usePvStore } from './pvStore';
import { isValidPv, searchPv, sortPv } from './pvLogic';

const today = () => new Date().toISOString().slice(0, 10);

export default function PvDocumentsPage() {
  const { t } = useTranslation();
  const { docs, add } = usePvStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [docDate, setDocDate] = useState(today());
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');

  const results = useMemo(() => sortPv(searchPv(docs, query)), [docs, query]);
  const valid = isValidPv(title, docDate);

  const submit = () => {
    if (!valid) return;
    add({ title, doc_date: docDate, category, content_text: content });
    toast.success(t('pv.added'));
    setOpen(false);
    setTitle('');
    setCategory('');
    setContent('');
    setDocDate(today());
  };

  return (
    <div>
      <PageHeader
        title={t('pv.title')}
        subtitle={t('pv.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('pv.new')}
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          placeholder={t('pv.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('common.search')}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('pv.empty')} icon={<FileSignature className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((d) => (
            <Card key={d.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{d.title}</p>
                <Badge tone="primary">{d.category}</Badge>
              </div>
              {d.content_text && <p className="text-sm text-muted">{d.content_text}</p>}
              <p className="text-sm text-muted">{formatDate(d.doc_date)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('pv.new')}
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
        <div className="space-y-3">
          <Input label={t('pv.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label={t('pv.date')}
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
          />
          <Input
            label={t('pv.category')}
            placeholder={t('pv.categoryHint')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Textarea
            label={t('pv.content')}
            placeholder={t('pv.contentHint')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
