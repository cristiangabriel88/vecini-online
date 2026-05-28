import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertCircle, Plus, Clock } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { formatDateTime } from '@/shared/lib/format';
import type { TicketSeverity, TicketStatus } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieTickets } from './ticketsStore';
import { isSlaBreached } from './ticketLogic';
import { hydrateTickets, submitTicket } from './ticketsApi';

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

export default function TicketsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const reporterUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const items = useAsociatieTickets();
  const [open, setOpen] = useState(false);

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
    toast.success(t('tickets.submitted'));
    setOpen(false);
    setForm({ title: '', description: '', category: 'electric', severity: 'medium', location: '' });
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

      {items.length === 0 ? (
        <EmptyState body={t('tickets.empty')} icon={<AlertCircle className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {items.map((tk) => {
            const breached = isSlaBreached(tk.sla_due_at, tk.resolved_at);
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
    </div>
  );
}
