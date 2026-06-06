import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertCircle, Clock, Download, Paperclip, Plus, Star, Upload, X } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { formatDateTime } from '@/shared/lib/format';
import { formatFileSize, readFileAsDataUrl } from '@/shared/lib/file';
import { downscalePhoto } from '@/shared/lib/imageResize';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import type { TicketAttachment, TicketSeverity, TicketStatus } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieTickets, useTicketsStore } from './ticketsStore';
import {
  allowedTransitions,
  applyRating,
  applyStatusTransition,
  canRateTicket,
  isSlaBreached,
  TICKET_ATTACHMENT_ACCEPT,
  TICKET_ATTACHMENT_MAX_FILES,
  validateTicketFile,
} from './ticketLogic';
import { recordAudit } from '@/shared/store/auditStore';
import {
  getTicketAttachmentUrl,
  hydrateTickets,
  submitTicket,
} from './ticketsApi';
import { emitTicketStatusChanged } from '@/features/notifications/notificationFanout';

const statusTone: Record<TicketStatus, 'neutral' | 'primary' | 'warning' | 'success' | 'danger'> = {
  primit: 'neutral',
  asignat: 'primary',
  in_lucru: 'warning',
  rezolvat: 'success',
  verificat: 'success',
  inchis: 'neutral',
  respins: 'danger',
};

const CATEGORIES = ['electric', 'apa', 'lift', 'iluminat', 'curatenie', 'incalzire', 'altele'];

const NOTES_REQUIRED: ReadonlySet<TicketStatus> = new Set(['rezolvat', 'respins']);

interface PendingFile {
  name: string;
  size: number;
  type: string;
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

export default function TicketsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const activeRoleFn = useAuthStore((s) => s.activeRole);
  const role = activeRoleFn();
  const reporterUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const items = useAsociatieTickets();
  const fetchError = useTicketsStore((s) => s.fetchError);
  const updateTicket = useTicketsStore((s) => s.updateTicket);

  const isManager = role === 'admin' || role === 'presedinte' || role === 'comitet';

  const [open, setOpen] = useState(false);
  const [advanceModal, setAdvanceModal] = useState<{
    ticketId: string;
    newStatus: TicketStatus;
  } | null>(null);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [rateModal, setRateModal] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asociatieId) void hydrateTickets(asociatieId);
  }, [asociatieId]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'electric',
    severity: 'medium' as TicketSeverity,
    location: '',
  });

  const clearModal = () => {
    setOpen(false);
    setForm({ title: '', description: '', category: 'electric', severity: 'medium', location: '' });
    setPendingFiles([]);
    setFileError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const incoming = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const valid: PendingFile[] = [];
    for (const file of incoming) {
      const err = validateTicketFile(file);
      if (err) {
        setFileError(t(err === 'too_large' ? 'tickets.fileTooLarge' : 'tickets.fileBadType'));
        return;
      }
      valid.push({ name: file.name, size: file.size, type: file.type, file });
    }
    if (pendingFiles.length + valid.length > TICKET_ATTACHMENT_MAX_FILES) {
      setFileError(t('tickets.tooManyFiles'));
      return;
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  };

  const submit = async () => {
    if (!asociatieId || !form.title.trim() || !form.description.trim() || saving) return;
    setSaving(true);
    try {
      const offlineAttachments: TicketAttachment[] = [];
      if (!isSupabaseConfigured && pendingFiles.length) {
        for (let i = 0; i < pendingFiles.length; i++) {
          const f = pendingFiles[i];
          const resized = await downscalePhoto(f.file);
          const dataUrl = await readFileAsDataUrl(resized);
          offlineAttachments.push({
            id: `att-${Date.now()}-${i}`,
            ticket_id: '',
            file_name: resized.name,
            file_size: resized.size,
            mime_type: resized.type,
            storage_path: null,
            file_data_url: dataUrl,
            created_at: new Date().toISOString(),
          });
        }
      }
      const liveFiles = isSupabaseConfigured ? pendingFiles.map((p) => p.file) : [];
      submitTicket(asociatieId, reporterUserId, form, offlineAttachments, liveFiles);
      recordAudit({ action: 'ticket.submitted', entity: 'ticket', entity_label: form.title.trim() });
      toast.success(t('tickets.submitted'));
      clearModal();
    } catch {
      toast.error(t('tickets.uploadFailed'));
    } finally {
      setSaving(false);
    }
  };

  const downloadAttachment = async (att: TicketAttachment) => {
    if (isSupabaseConfigured && att.storage_path) {
      const url = await getTicketAttachmentUrl(att.storage_path);
      if (url) triggerDownload(url, att.file_name);
      else toast.error(t('tickets.downloadFailed'));
    } else if (att.file_data_url) {
      triggerDownload(att.file_data_url, att.file_name);
    }
  };

  const handleAdvanceDirect = (ticketId: string, newStatus: TicketStatus) => {
    if (!asociatieId) return;
    const ticket = items.find((t) => t.id === ticketId);
    updateTicket(asociatieId, ticketId, (tk) =>
      applyStatusTransition(tk, newStatus, reporterUserId),
    );
    if (ticket) emitTicketStatusChanged(ticket, newStatus);
    recordAudit({ action: 'ticket.advanced', entity: 'ticket', entity_label: newStatus });
    toast.success(t('tickets.advanceDone'));
  };

  const openAdvanceModal = (ticketId: string, newStatus: TicketStatus) => {
    setAdvanceModal({ ticketId, newStatus });
    setAdvanceNotes('');
  };

  const confirmAdvance = () => {
    if (!advanceModal || !asociatieId) return;
    const ticket = items.find((t) => t.id === advanceModal.ticketId);
    updateTicket(asociatieId, advanceModal.ticketId, (tk) =>
      applyStatusTransition(tk, advanceModal.newStatus, reporterUserId, advanceNotes.trim() || null),
    );
    if (ticket) emitTicketStatusChanged(ticket, advanceModal.newStatus);
    recordAudit({
      action: 'ticket.advanced',
      entity: 'ticket',
      entity_label: advanceModal.newStatus,
    });
    toast.success(t('tickets.advanceDone'));
    setAdvanceModal(null);
  };

  const confirmRate = () => {
    if (!rateModal || !asociatieId || selectedRating === 0) return;
    updateTicket(asociatieId, rateModal, (tk) => applyRating(tk, selectedRating));
    toast.success(t('tickets.rateDone'));
    setRateModal(null);
    setSelectedRating(0);
  };

  return (
    <div>
      <PageHeader
        title={t('tickets.title')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('tickets.new')}
          </Button>
        }
      />

      {fetchError ? (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button variant="ghost" onClick={() => { if (asociatieId) void hydrateTickets(asociatieId); }}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState body={t('tickets.empty')} icon={<AlertCircle className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {items.map((tk) => {
            const breached = isSlaBreached(tk.sla_due_at, tk.resolved_at);
            const nextStatuses = allowedTransitions(tk.status, role);
            const canRate = canRateTicket(tk, reporterUserId);
            const attachments = tk.attachments ?? [];
            return (
              <Card key={tk.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{tk.title}</h2>
                  <Badge tone={statusTone[tk.status]}>{t(`tickets.status_${tk.status}`)}</Badge>
                </div>
                <p className="mb-2 text-muted">{tk.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span>{t(`tickets.severity_${tk.severity}`)}</span>
                  {tk.location_description && <span>· {tk.location_description}</span>}
                  <span>· {formatDateTime(tk.created_at)}</span>
                  {breached && (
                    <span className="flex items-center gap-1 text-danger">
                      <Clock className="h-4 w-4" /> SLA depășit
                    </span>
                  )}
                </div>
                {tk.resolution_notes && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium">{t('tickets.resolutionNotesLabel')}</span>{' '}
                    {tk.resolution_notes}
                  </p>
                )}
                {tk.rating !== null && (
                  <div className="mt-2 flex items-center gap-1 text-sm text-muted">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < tk.rating! ? 'fill-warning text-warning' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((att) => (
                      <Button
                        key={att.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => void downloadAttachment(att)}
                        aria-label={`${t('tickets.download')}: ${att.file_name}`}
                      >
                        <Download className="h-4 w-4" /> {att.file_name}
                        {att.file_size > 0 ? ` (${formatFileSize(att.file_size)})` : ''}
                      </Button>
                    ))}
                  </div>
                )}
                {(isManager && nextStatuses.length > 0) || canRate ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                    {isManager &&
                      nextStatuses.map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={next === 'respins' ? 'danger' : 'ghost'}
                          onClick={() => {
                            if (NOTES_REQUIRED.has(next)) {
                              openAdvanceModal(tk.id, next);
                            } else {
                              handleAdvanceDirect(tk.id, next);
                            }
                          }}
                        >
                          {t(`tickets.advance_${next}`)}
                        </Button>
                      ))}
                    {canRate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRateModal(tk.id);
                          setSelectedRating(0);
                        }}
                      >
                        <Star className="h-4 w-4" /> {t('tickets.rate')}
                      </Button>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={clearModal}
        title={t('tickets.new')}
        footer={
          <>
            <Button variant="ghost" onClick={clearModal} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={!asociatieId || !form.title.trim() || !form.description.trim() || saving}
              loading={saving}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('tickets.ticketTitle')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label={t('tickets.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label={t('tickets.category')}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label={t('tickets.severity')}
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value as TicketSeverity })}
          >
            <option value="low">{t('tickets.severity_low')}</option>
            <option value="medium">{t('tickets.severity_medium')}</option>
            <option value="high">{t('tickets.severity_high')}</option>
            <option value="critical">{t('tickets.severity_critical')}</option>
          </Select>
          <Input
            label={t('tickets.location')}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium">{t('tickets.attachPhoto')}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={TICKET_ATTACHMENT_ACCEPT}
              className="sr-only"
              aria-label={t('tickets.attachPhoto')}
              onChange={handleFileChange}
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
                      aria-label={`${t('tickets.removeFile')}: ${p.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={pendingFiles.length >= TICKET_ATTACHMENT_MAX_FILES}
            >
              <Upload className="h-4 w-4" /> {t('tickets.attachPhoto')}
            </Button>
            {fileError && <p className="mt-1 text-xs text-error">{fileError}</p>}
            {!fileError && pendingFiles.length === 0 && (
              <p className="mt-1 text-xs text-muted">{t('tickets.attachmentsHint')}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Advance-status modal (for transitions that may carry resolution notes) */}
      <Modal
        open={advanceModal !== null}
        onClose={() => setAdvanceModal(null)}
        title={t('tickets.advanceTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdvanceModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={advanceModal?.newStatus === 'respins' ? 'danger' : 'primary'}
              onClick={confirmAdvance}
            >
              {advanceModal ? t(`tickets.advance_${advanceModal.newStatus}`) : ''}
            </Button>
          </>
        }
      >
        <Textarea
          label={t('tickets.resolutionNotes')}
          value={advanceNotes}
          onChange={(e) => setAdvanceNotes(e.target.value)}
        />
      </Modal>

      {/* Rating modal */}
      <Modal
        open={rateModal !== null}
        onClose={() => setRateModal(null)}
        title={t('tickets.rateTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRateModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmRate} disabled={selectedRating === 0}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} stele`}
              onClick={() => setSelectedRating(n)}
              className="transition-transform hover:scale-110 focus-visible:outline-none"
            >
              <Star
                className={`h-8 w-8 ${n <= selectedRating ? 'fill-warning text-warning' : 'text-muted'}`}
              />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
