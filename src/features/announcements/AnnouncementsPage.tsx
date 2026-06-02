import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Calendar, Check, Download, Paperclip, Plus, Upload, X } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { formatDateTime } from '@/shared/lib/format';
import { sanitizeHtml } from '@/shared/lib/sanitize';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { formatFileSize, readFileAsDataUrl } from '@/shared/lib/file';
import type { AnnouncementAttachment, AnnouncementCategory } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { recordAudit } from '@/shared/store/auditStore';
import { useAnnouncementsStore, useAsociatieAnnouncements } from './announcementsStore';
import {
  hydrateAnnouncements,
  publishAnnouncement,
  uploadAnnouncementAttachments,
  getAttachmentSignedUrl,
} from './announcementsApi';
import {
  ATTACHMENT_ACCEPT,
  canManageAnnouncements,
  isScheduledPending,
  validateAttachmentFile,
  visibleAnnouncements,
} from './announcementsLogic';

const categoryTone: Record<AnnouncementCategory, 'urgent' | 'warning' | 'primary' | 'success'> = {
  urgent: 'urgent',
  important: 'warning',
  informativ: 'primary',
  eveniment: 'success',
};

interface PendingFile {
  name: string;
  size: number;
  type: string;
  /** Base64 data URL -- populated offline; null in live (Storage) mode. */
  dataUrl: string | null;
  file: File;
}

function triggerDownload(url: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const role = useAuthStore((s) => s.activeRole());
  const authorUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const canManage = canManageAnnouncements(role);
  const all = useAsociatieAnnouncements();
  // Residents only see due announcements; managers also see scheduled-pending ones.
  const items = canManage ? all : visibleAnnouncements(all);
  const { reads, markRead, fetchError } = useAnnouncementsStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (asociatieId) void hydrateAnnouncements(asociatieId);
  }, [asociatieId]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('informativ');
  const [schedule, setSchedule] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearModal = () => {
    setOpen(false);
    setTitle('');
    setBody('');
    setCategory('informativ');
    setSchedule('');
    setPendingFiles([]);
    setFileError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    for (const file of files) {
      const err = validateAttachmentFile(file);
      if (err) {
        setFileError(t(`announcements.${err}`));
        continue;
      }
      try {
        const dataUrl = isSupabaseConfigured ? null : await readFileAsDataUrl(file);
        setPendingFiles((prev) => [
          ...prev,
          { name: file.name, size: file.size, type: file.type, dataUrl, file },
        ]);
      } catch {
        setFileError(t('announcements.readFailed'));
      }
    }
  };

  const submit = async () => {
    if (!asociatieId || !title.trim() || !body.trim() || saving) return;
    setSaving(true);
    try {
      const scheduledIso = schedule ? new Date(schedule).toISOString() : null;
      let attachments: AnnouncementAttachment[] = [];
      if (isSupabaseConfigured && pendingFiles.length) {
        const uploaded = await uploadAnnouncementAttachments(
          asociatieId,
          pendingFiles.map((p) => p.file),
        );
        if (!uploaded) {
          toast.error(t('announcements.uploadFailed'));
          return;
        }
        attachments = uploaded;
      } else if (pendingFiles.length) {
        attachments = pendingFiles.map((p, i) => ({
          id: `att-${Date.now()}-${i}`,
          file_name: p.name,
          file_size: p.size,
          file_type: p.type,
          storage_path: null,
          file_data_url: p.dataUrl,
        }));
      }
      publishAnnouncement(asociatieId, authorUserId, {
        title: title.trim(),
        body_html: `<p>${body.trim()}</p>`,
        category,
        scheduled_at: scheduledIso,
        attachments,
      });
      recordAudit({
        action: 'announcement.published',
        entity: 'announcement',
        entity_label: title.trim(),
        before: null,
        after: category,
      });
      const isFuture = !!scheduledIso && new Date(scheduledIso).getTime() > Date.now();
      toast.success(isFuture ? t('announcements.scheduled') : t('announcements.published'));
      clearModal();
    } finally {
      setSaving(false);
    }
  };

  const downloadAttachment = async (att: AnnouncementAttachment) => {
    if (isSupabaseConfigured && att.storage_path) {
      const url = await getAttachmentSignedUrl(att.storage_path);
      if (url) triggerDownload(url, att.file_name);
      else toast.error(t('announcements.downloadFailed'));
    } else if (att.file_data_url) {
      triggerDownload(att.file_data_url, att.file_name);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('announcements.title')}
        action={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t('announcements.new')}
            </Button>
          ) : undefined
        }
      />

      {fetchError ? (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button variant="ghost" onClick={() => { if (asociatieId) void hydrateAnnouncements(asociatieId); }}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState body={t('announcements.empty')} />
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const pending = isScheduledPending(a);
            const attachments = a.attachments ?? [];
            return (
              <Card key={a.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{a.title}</h2>
                  <div className="flex items-center gap-2">
                    {pending && (
                      <Badge tone="warning">
                        <Calendar className="h-3 w-3" /> {t('announcements.scheduledBadge')}
                      </Badge>
                    )}
                    <Badge tone={categoryTone[a.category]}>{t(`announcements.category_${a.category}`)}</Badge>
                  </div>
                </div>
                <p className="mb-2 text-sm text-muted">
                  {pending
                    ? t('announcements.scheduledFor', { date: formatDateTime(a.scheduled_at!) })
                    : a.published_at
                      ? formatDateTime(a.published_at)
                      : a.scheduled_at
                        ? formatDateTime(a.scheduled_at)
                        : ''}
                </p>
                <div
                  className="prose prose-sm max-w-none text-text"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.body_html) }}
                />
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((att) => (
                      <Button
                        key={att.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => void downloadAttachment(att)}
                        aria-label={`${t('announcements.download')}: ${att.file_name}`}
                      >
                        <Download className="h-4 w-4" /> {att.file_name}
                        {att.file_size > 0 ? ` (${formatFileSize(att.file_size)})` : ''}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted">
                    {t('announcements.readBy', { read: reads[a.id] ? 1 : 0, total: 24 })}
                  </span>
                  <Button
                    variant={reads[a.id] ? 'ghost' : 'secondary'}
                    size="sm"
                    disabled={!!reads[a.id]}
                    onClick={() => markRead(a.id)}
                  >
                    <Check className="h-4 w-4" />
                    {reads[a.id] ? t('announcements.markedRead') : t('announcements.markRead')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={clearModal}
        title={t('announcements.compose')}
        footer={
          <>
            <Button variant="ghost" onClick={clearModal} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={!asociatieId || !title.trim() || !body.trim() || saving}
            >
              {saving
                ? t('announcements.uploading')
                : schedule
                  ? t('announcements.schedule')
                  : t('common.publish')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('announcements.announcementTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select
            label={t('announcements.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
          >
            <option value="urgent">{t('announcements.category_urgent')}</option>
            <option value="important">{t('announcements.category_important')}</option>
            <option value="informativ">{t('announcements.category_informativ')}</option>
            <option value="eveniment">{t('announcements.category_eveniment')}</option>
          </Select>
          <Textarea
            label={t('announcements.body')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Input
            type="datetime-local"
            label={t('announcements.scheduleLabel')}
            hint={t('announcements.scheduleHint')}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium">{t('announcements.attachmentsLabel')}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              className="sr-only"
              aria-label={t('announcements.attachmentsLabel')}
              onChange={(e) => void handleFileChange(e)}
            />
            {pendingFiles.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {pendingFiles.map((p, i) => (
                  <li
                    key={`${p.name}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {p.name} ({formatFileSize(p.size)})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`${t('announcements.removeFile')}: ${p.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> {t('announcements.chooseFile')}
            </Button>
            {fileError && <p className="mt-1 text-xs text-error">{fileError}</p>}
            {!fileError && pendingFiles.length === 0 && (
              <p className="mt-1 text-xs text-muted">{t('announcements.attachmentsHint')}</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
