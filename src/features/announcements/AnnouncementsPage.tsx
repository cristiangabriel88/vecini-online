import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Calendar, Check, Download, Paperclip, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { DatePicker } from '@/shared/components/DatePicker';
import { formatDateTime } from '@/shared/lib/format';
import { sanitizeHtml } from '@/shared/lib/sanitize';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { formatFileSize, readFileAsDataUrl } from '@/shared/lib/file';
import { downscalePhoto } from '@/shared/lib/imageResize';
import type { Announcement, AnnouncementAttachment, AnnouncementCategory } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { recordAudit } from '@/shared/store/auditStore';
import { useWriteRetry } from '@/shared/lib/useWriteRetry';
import { useAnnouncementsStore, useAsociatieAnnouncements } from './announcementsStore';
import {
  hydrateAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
  uploadAnnouncementAttachments,
  getAttachmentSignedUrl,
  deleteAnnouncements,
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

// ---------------------------------------------------------------------------
// Compose modal -- owns all draft state so keystrokes only re-render this
// subtree, not the announcement list behind it.
// ---------------------------------------------------------------------------

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  asociatieId: string | null;
  authorUserId: string;
  editTarget?: Announcement;
}

function AnnouncementComposeModal({ open, onClose, asociatieId, authorUserId, editTarget }: ComposeModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('informativ');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const writeRetry = useWriteRetry('announcements.write');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setTitle(editTarget.title);
      setBody(editTarget.body_html.replace(/^<p>/, '').replace(/<\/p>$/, ''));
      setCategory(editTarget.category);
      if (editTarget.scheduled_at) {
        const iso = new Date(editTarget.scheduled_at).toISOString().slice(0, 16);
        setScheduleDate(iso.slice(0, 10));
        setScheduleTime(iso.slice(11));
      } else {
        setScheduleDate('');
        setScheduleTime('');
      }
    } else {
      setTitle('');
      setBody('');
      setCategory('informativ');
      setScheduleDate('');
      setScheduleTime('');
    }
    setPendingFiles([]);
    setFileError(null);
  }, [open, editTarget]);

  const handleClose = () => {
    setTitle('');
    setBody('');
    setCategory('informativ');
    setScheduleDate('');
    setScheduleTime('');
    setPendingFiles([]);
    setFileError(null);
    writeRetry.clearError();
    onClose();
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
        const resized = await downscalePhoto(file);
        const dataUrl = isSupabaseConfigured ? null : await readFileAsDataUrl(resized);
        setPendingFiles((prev) => [
          ...prev,
          { name: resized.name, size: resized.size, type: resized.type, dataUrl, file: resized },
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
      if (editTarget) {
        const ok = await writeRetry.run(() =>
          updateAnnouncement(asociatieId, editTarget.id, {
            title: title.trim(),
            body_html: `<p>${body.trim()}</p>`,
            category,
          }),
        );
        if (!ok) return;
        recordAudit({
          action: 'announcement.published',
          entity: 'announcement',
          entity_label: title.trim(),
          before: editTarget.category,
          after: category,
        });
        toast.success(t('announcements.updated'));
        handleClose();
        return;
      }
      const scheduledIso = scheduleDate
        ? new Date(`${scheduleDate}T${scheduleTime || '00:00'}:00`).toISOString()
        : null;
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
      const ok = await writeRetry.run(() =>
        publishAnnouncement(asociatieId, authorUserId, {
          title: title.trim(),
          body_html: `<p>${body.trim()}</p>`,
          category,
          scheduled_at: scheduledIso,
          attachments,
        }),
      );
      if (!ok) return;
      recordAudit({
        action: 'announcement.published',
        entity: 'announcement',
        entity_label: title.trim(),
        before: null,
        after: category,
      });
      const isFuture = !!scheduledIso && new Date(scheduledIso).getTime() > Date.now();
      toast.success(isFuture ? t('announcements.scheduled') : t('announcements.published'));
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editTarget ? t('announcements.editTitle') : t('announcements.compose')}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!asociatieId || !title.trim() || !body.trim() || saving || writeRetry.pending}
          >
            {saving
              ? t('announcements.uploading')
              : editTarget
                ? t('common.save')
                : scheduleDate
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
        <DatePicker
          label={t('announcements.scheduleLabel')}
          hint={scheduleDate ? undefined : t('announcements.scheduleHint')}
          value={scheduleDate}
          onChange={setScheduleDate}
        />
        {scheduleDate && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                type="time"
                label={t('announcements.scheduleTimeLabel')}
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setScheduleDate(''); setScheduleTime(''); }}
              aria-label={t('announcements.clearSchedule')}
            >
              <X className="h-4 w-4" />
              {t('announcements.clearSchedule')}
            </Button>
          </div>
        )}
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
        {writeRetry.error && (
          <p role="alert" className="text-xs text-destructive" data-testid="publish-error">
            {t('common.writeError')}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Row component -- memoized so it only re-renders when its own props change.
// sanitizeHtml (DOMPurify DOM-parse) is memoized per item via useMemo, so it
// runs once per unique body_html rather than once per keystroke in the modal.
// ---------------------------------------------------------------------------

interface RowProps {
  a: Announcement;
  canManage: boolean;
  authorUserId: string;
  isSelected: boolean;
  isRead: boolean;
  onToggle: (id: string) => void;
  onEdit: (a: Announcement) => void;
  onDelete: (id: string) => void;
  onMarkRead: (id: string) => void;
  onDownload: (att: AnnouncementAttachment) => void;
}

const AnnouncementRow = memo(function AnnouncementRow({
  a,
  canManage,
  authorUserId,
  isSelected,
  isRead,
  onToggle,
  onEdit,
  onDelete,
  onMarkRead,
  onDownload,
}: RowProps) {
  const { t } = useTranslation();
  const html = useMemo(() => sanitizeHtml(a.body_html), [a.body_html]);
  const pending = isScheduledPending(a);
  const attachments = a.attachments ?? [];
  const canDelete = canManage || a.author_user_id === authorUserId;

  return (
    <div className="flex items-start gap-3">
      {canManage && (
        <input
          type="checkbox"
          className="mt-4 h-4 w-4 shrink-0 cursor-pointer rounded border-border"
          checked={isSelected}
          onChange={() => onToggle(a.id)}
          aria-label={a.title}
        />
      )}
      <Card className="min-w-0 flex-1">
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
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <Button
                key={att.id}
                variant="ghost"
                size="sm"
                onClick={() => onDownload(att)}
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
            {t('announcements.readBy', { read: isRead ? 1 : 0, total: 24 })}
          </span>
          <div className="flex items-center gap-1">
            {canDelete && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(a)}
                  aria-label={t('announcements.editTitle')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(a.id)}
                  aria-label={t('announcements.deleteOne')}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </>
            )}
            <Button
              variant={isRead ? 'ghost' : 'secondary'}
              size="sm"
              disabled={isRead}
              onClick={() => onMarkRead(a.id)}
            >
              <Check className="h-4 w-4" />
              {isRead ? t('announcements.markedRead') : t('announcements.markRead')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Page -- holds only open flag + list derivation + bulk selection.
// All draft form state lives in AnnouncementComposeModal above.
// ---------------------------------------------------------------------------

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const role = useAuthStore((s) => s.activeRole());
  const authorUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const canManage = canManageAnnouncements(role);
  const all = useAsociatieAnnouncements();
  const items = useMemo(
    () => (canManage ? all : visibleAnnouncements(all)),
    [canManage, all],
  );
  const { reads, markRead, fetchError } = useAnnouncementsStore();
  const [open, setOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const toggleAll = useCallback(
    () => setSelectedIds(allSelected ? new Set() : new Set(items.map((a) => a.id))),
    [allSelected, items],
  );

  useEffect(() => {
    if (asociatieId) void hydrateAnnouncements(asociatieId);
  }, [asociatieId]);

  const handleToggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleEdit = useCallback((a: Announcement) => {
    setEditingAnnouncement(a);
    setOpen(true);
  }, []);

  const handleDeleteOne = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const confirmDeleteOne = useCallback(() => {
    if (!asociatieId || !pendingDeleteId) return;
    deleteAnnouncements(asociatieId, [pendingDeleteId]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(pendingDeleteId);
      return next;
    });
    toast.success(t('announcements.deleted'));
    setPendingDeleteId(null);
  }, [asociatieId, pendingDeleteId, t]);

  const handleDeleteSelected = useCallback(() => {
    setPendingBulkDelete(true);
  }, []);

  const confirmDeleteSelected = useCallback(() => {
    if (!asociatieId) return;
    const ids = [...selectedIds];
    deleteAnnouncements(asociatieId, ids);
    setSelectedIds(new Set());
    toast.success(t('announcements.deletedBulk', { count: ids.length }));
    setPendingBulkDelete(false);
  }, [asociatieId, selectedIds, t]);

  const handleMarkRead = useCallback((id: string) => {
    markRead(id);
  }, [markRead]);

  const handleDownload = useCallback((att: AnnouncementAttachment) => {
    if (isSupabaseConfigured && att.storage_path) {
      void getAttachmentSignedUrl(att.storage_path).then((url) => {
        if (url) triggerDownload(url, att.file_name);
        else toast.error(t('announcements.downloadFailed'));
      });
    } else if (att.file_data_url) {
      triggerDownload(att.file_data_url, att.file_name);
    }
  }, [t]);

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
          {canManage && (
            <div className="flex items-center gap-3 py-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={allSelected ? t('announcements.deselectAll') : t('announcements.selectAll')}
                />
                <span>{allSelected ? t('announcements.deselectAll') : t('announcements.selectAll')}</span>
              </label>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-danger"
                  onClick={handleDeleteSelected}
                  aria-label={t('announcements.deleteSelected', { count: selectedIds.size })}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('announcements.deleteSelected', { count: selectedIds.size })}
                </Button>
              )}
            </div>
          )}
          {items.map((a) => (
            <AnnouncementRow
              key={a.id}
              a={a}
              canManage={canManage}
              authorUserId={authorUserId}
              isSelected={selectedIds.has(a.id)}
              isRead={!!reads[a.id]}
              onToggle={handleToggleItem}
              onEdit={handleEdit}
              onDelete={handleDeleteOne}
              onMarkRead={handleMarkRead}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      <AnnouncementComposeModal
        open={open}
        onClose={() => { setOpen(false); setEditingAnnouncement(null); }}
        asociatieId={asociatieId}
        authorUserId={authorUserId}
        editTarget={editingAnnouncement ?? undefined}
      />

      <Modal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title={t('announcements.deleteOne')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteOne}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('announcements.deleteConfirm')}</p>
      </Modal>

      <Modal
        open={pendingBulkDelete}
        onClose={() => setPendingBulkDelete(false)}
        title={t('announcements.deleteBulkTitle', { count: selectedIds.size })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingBulkDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteSelected}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('announcements.deleteBulkConfirm', { count: selectedIds.size })}</p>
      </Modal>
    </div>
  );
}
