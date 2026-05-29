import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Download, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { recordAudit } from '@/shared/store/auditStore';
import { useDocumentsStore } from './documentsStore';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_CATEGORIES,
  canManageDocuments,
  formatFileSize,
  isValidDocument,
  readFileAsDataUrl,
  searchDocuments,
  validateDocumentFile,
} from './documentLogic';

interface PendingFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

function triggerDownload(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { documents, add, remove } = useDocumentsStore();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId) ?? DEMO_ASOCIATIE.id;
  const role = useAuthStore((s) => s.activeRole());
  const canManage = canManageDocuments(role);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const results = searchDocuments(documents, query, category);
  const valid = isValidDocument(title);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateDocumentFile(file);
    if (err) {
      setFileError(t(`documents.${err}`));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingFile({ name: file.name, size: file.size, type: file.type, dataUrl });
    } catch {
      setFileError(t('documents.readFailed'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearModal = () => {
    setOpen(false);
    setTitle('');
    setContent('');
    setNewCategory(DOCUMENT_CATEGORIES[0]);
    setPendingFile(null);
    setFileError(null);
  };

  const submit = () => {
    if (!valid) return;
    add(asociatieId, {
      title,
      category: newCategory,
      content_text: content,
      file_name: pendingFile?.name ?? null,
      file_size: pendingFile?.size ?? null,
      file_type: pendingFile?.type ?? null,
      file_data_url: pendingFile?.dataUrl ?? null,
    });
    recordAudit({ action: 'document.uploaded', entity: 'document', entity_label: title.trim() });
    toast.success(t('documents.added'));
    clearModal();
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const doc = documents.find((d) => d.id === deleteId);
    remove(deleteId);
    if (doc) {
      recordAudit({ action: 'document.deleted', entity: 'document', entity_label: doc.title });
    }
    toast.success(t('documents.deleted'));
    setDeleteId(null);
  };

  return (
    <div>
      <PageHeader
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        action={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t('documents.new')}
            </Button>
          ) : undefined
        }
      />

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
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{d.title}</p>
                <Badge tone="primary">{d.category}</Badge>
              </div>
              {d.content_text && <p className="mt-1 text-sm text-text">{d.content_text}</p>}
              <p className="mt-1 text-sm text-muted">
                {t('documents.version', { n: d.version })} · {formatDate(d.created_at)}
                {d.file_name && (
                  <> · {d.file_name}{d.file_size != null ? ` (${formatFileSize(d.file_size)})` : ''}</>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.file_data_url && d.file_name && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => triggerDownload(d.file_data_url!, d.file_name!)}
                    aria-label={t('documents.download')}
                  >
                    <Download className="h-4 w-4" /> {t('documents.download')}
                  </Button>
                )}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(d.id)}
                    aria-label={t('documents.delete')}
                  >
                    <Trash2 className="h-4 w-4" /> {t('documents.delete')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add document modal */}
      <Modal
        open={open}
        onClose={clearModal}
        title={t('documents.new')}
        footer={
          <>
            <Button variant="ghost" onClick={clearModal}>
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
          <div>
            <p className="mb-1.5 text-sm font-medium">{t('documents.fileLabel')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="sr-only"
              aria-label={t('documents.fileLabel')}
              onChange={handleFileChange}
            />
            {pendingFile ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {pendingFile.name} ({formatFileSize(pendingFile.size)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingFile(null)}
                  aria-label={t('documents.removeFile')}
                >
                  {t('documents.removeFile')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> {t('documents.chooseFile')}
              </Button>
            )}
            {fileError && <p className="mt-1 text-xs text-error">{fileError}</p>}
            {!pendingFile && !fileError && (
              <p className="mt-1 text-xs text-muted">{t('documents.fileHint')}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title={t('documents.deleteTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('documents.delete')}
            </Button>
          </>
        }
      >
        <p>{t('documents.deleteBody')}</p>
      </Modal>
    </div>
  );
}
