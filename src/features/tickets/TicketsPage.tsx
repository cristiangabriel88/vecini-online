import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertCircle, Plus, Clock, Star } from 'lucide-react';
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
import type { TicketSeverity, TicketStatus } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieTickets, useTicketsStore } from './ticketsStore';
import {
  allowedTransitions,
  applyRating,
  applyStatusTransition,
  canRateTicket,
  isSlaBreached,
} from './ticketLogic';
import { recordAudit } from '@/shared/store/auditStore';
import { hydrateTickets, submitTicket } from './ticketsApi';
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

  const submit = () => {
    if (!asociatieId || !form.title.trim() || !form.description.trim()) return;
    submitTicket(asociatieId, reporterUserId, form);
    recordAudit({ action: 'ticket.submitted', entity: 'ticket', entity_label: form.title.trim() });
    toast.success(t('tickets.submitted'));
    setOpen(false);
    setForm({ title: '', description: '', category: 'electric', severity: 'medium', location: '' });
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
        onClose={() => setOpen(false)}
        title={t('tickets.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={submit}
              disabled={!asociatieId || !form.title.trim() || !form.description.trim()}
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
