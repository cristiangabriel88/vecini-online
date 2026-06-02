import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Download, FileSignature, Plus, Search, Upload } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { validateFile } from '@/shared/lib/file';
import { useAuthStore } from '@/shared/store/authStore';
import { usePvStore, useAsociatiePvDocs } from './pvStore';
import { isValidPv, searchPv, sortPv, canManagePv } from './pvLogic';
import { hydratePvDocuments, addPvDocument, getPvSignedUrl } from './pvApi';

const today = () => new Date().toISOString().slice(0, 10);

const PV_MAX_BYTES = 10 * 1024 * 1024;
const PV_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;

export default function PvDocumentsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const role = useAuthStore((s) => s.activeRole());
  const canManage = canManagePv(role);
  const docs = useAsociatiePvDocs();
  const fetchError = usePvStore((s) => s.fetchError);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [docDate, setDocDate] = useState(today());
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hydratePvDocuments(asociatieId ?? '');
  }, [asociatieId]);

  const results = useMemo(() => sortPv(searchPv(docs, query)), [docs, query]);
  const valid = isValidPv(title, docDate);

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setContent('');
    setDocDate(today());
    setFile(null);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) { setFile(null); setFileError(null); return; }
    const err = validateFile(f, PV_MAX_BYTES, PV_ALLOWED_TYPES);
    if (err) { setFileError(err); setFile(null); return; }
    setFile(f);
    setFileError(null);
  };

  const submit = () => {
    if (!valid || !asociatieId) return;
    addPvDocument(asociatieId, { title, doc_date: docDate, category, content_text: content }, file ?? undefined);
    toast.success(t('pv.added'));
    setOpen(false);
    resetForm();
  };

  const handleDownload = async (storagePath: string) => {
    const url = await getPvSignedUrl(storagePath);
    if (url) window.open(url, '_blank');
    else toast.error(t('common.error'));
  };

  if (fetchError) {
    return (
      <>
        <PageHeader title={t('pv.title')} subtitle={t('pv.subtitle')} />
        <ErrorState
          body={t('common.loadError')}
          action={
            <Button variant="ghost" onClick={() => void hydratePvDocuments(asociatieId ?? '')}>
              {t('common.retry')}
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('pv.title')}
        subtitle={t('pv.subtitle')}
        action={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t('pv.new')}
            </Button>
          ) : undefined
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted">{formatDate(d.doc_date)}</p>
                {d.storage_path && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDownload(d.storage_path!)}
                    aria-label={t('pv.download')}
                  >
                    <Download className="h-4 w-4" />
                    {t('pv.download')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={t('pv.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('pv.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
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
          <div>
            <label className="block text-sm font-medium mb-1">{t('pv.file')}</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input p-3 text-sm text-muted hover:border-primary transition-colors">
              <Upload className="h-4 w-4 shrink-0" />
              <span>{file ? file.name : t('pv.fileHint')}</span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
            {fileError && (
              <p className="mt-1 text-sm text-destructive">
                {t(fileError === 'too_large' ? 'pv.fileTooLarge' : 'pv.fileBadType')}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
