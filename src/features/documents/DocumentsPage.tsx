import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileText, Plus, Info } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { isStorageAvailable } from '@/shared/lib/storage';
import { useDocumentsStore } from './documentsStore';
import { DOCUMENT_CATEGORIES, isValidDocument, searchDocuments } from './documentLogic';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { documents, add } = useDocumentsStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [content, setContent] = useState('');

  const results = searchDocuments(documents, query, category);
  const valid = isValidDocument(title);

  const submit = () => {
    if (!valid) return;
    add({ title, category: newCategory, content_text: content });
    toast.success(t('documents.added'));
    setOpen(false);
    setTitle('');
    setContent('');
    setNewCategory(DOCUMENT_CATEGORIES[0]);
  };

  return (
    <div>
      <PageHeader
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('documents.new')}
          </Button>
        }
      />

      {!isStorageAvailable && (
        <Card className="mb-4 flex items-start gap-3 p-4 text-sm text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>{t('documents.attachmentsUnavailable')}</p>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label={t('common.search')}
          placeholder={t('documents.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select aria-label={t('documents.category')} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{t('common.all')}</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('documents.empty')} icon={<FileText className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((d) => (
            <Card key={d.id} className="space-y-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{d.title}</p>
                <Badge tone="primary">{d.category}</Badge>
              </div>
              {d.content_text && <p className="text-sm text-text">{d.content_text}</p>}
              <p className="text-sm text-muted">
                {t('documents.version', { n: d.version })} · {formatDate(d.created_at)}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('documents.new')}
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
          <Input label={t('documents.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select label={t('documents.category')} value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Textarea
            label={t('documents.contentLabel')}
            hint={t('documents.contentHint')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
