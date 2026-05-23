import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  FileDown,
  FileWarning,
  ShieldAlert,
  Siren,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Switch } from '@/shared/components/Switch';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/shared/store/authStore';
import { useBreachStore } from '@/shared/store/breachStore';
import { formatDateTime } from '@/shared/lib/format';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import type { Lang } from '@/features/legal/legalContent';
import { authorityNotification, breachProcedure, subjectNotice } from './breachContent';
import {
  BREACH_NATURES,
  NO_RISK_FACTORS,
  awaitingAuthorityCount,
  classifyRisk,
  deadlineState,
  hoursToDeadline,
  isOpen,
  nextStatus,
  requiresAuthorityNotification,
  requiresSubjectNotification,
  sortBreaches,
  type BreachNature,
  type BreachRecord,
  type BreachRisk,
  type DeadlineState,
  type RiskFactors,
} from './breachLogic';

/** Roles allowed to manage the breach log (mirrors the table RLS). */
const BREACH_ADMIN_ROLES = ['admin', 'presedinte'] as const;

/** Data categories an admin can tag on a breach (i18n keys under `breach.data.*`). */
const DATA_CATEGORIES = ['identity', 'contact', 'apartment', 'financial', 'content', 'credentials'] as const;

const RISK_TONE: Record<BreachRisk, 'neutral' | 'warning' | 'danger'> = {
  low: 'neutral',
  risk: 'warning',
  high: 'danger',
};

const DEADLINE_TONE: Record<DeadlineState, 'neutral' | 'success' | 'warning' | 'danger'> = {
  not_required: 'neutral',
  done: 'success',
  on_time: 'success',
  due_soon: 'warning',
  overdue: 'danger',
};

const FACTOR_KEYS: (keyof RiskFactors)[] = ['sensitiveData', 'largeScale', 'identifiable', 'mitigated'];

function download(filename: string, contents: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Current local time in the `datetime-local` input format. */
function nowLocalInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function toIso(localValue: string): string {
  return localValue ? new Date(localValue).toISOString() : new Date().toISOString();
}

/**
 * Admin surface for the GDPR personal-data breach procedure (T22): the
 * association — the data controller — records a breach, classifies its risk, and
 * generates the article 33 notification to ANSPDCP (within 72 hours) plus, on a
 * high risk, the article 34 notice to the affected residents. The append-only
 * log is the accountability trail. Only the controller roles see it.
 */
export default function BreachAdminPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language.startsWith('en') ? 'en' : 'ro';

  const profile = useAuthStore((s) => s.profile);
  const activeRole = useAuthStore((s) => s.activeRole);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const localAsociatii = useAuthStore((s) => s.localAsociatii);

  const breaches = useBreachStore((s) => s.breaches);
  const record = useBreachStore((s) => s.record);
  const advance = useBreachStore((s) => s.advance);
  const notifyAuthority = useBreachStore((s) => s.notifyAuthority);
  const notifySubjects = useBreachStore((s) => s.notifySubjects);

  const asociatieId = currentAsociatieId ?? DEMO_ASOCIATIE.id;
  const asociatieName =
    localAsociatii.find((a) => a.id === currentAsociatieId)?.name ?? DEMO_ASOCIATIE.name;
  const actorName = profile?.full_name ?? DEMO_CURRENT_USER_NAME;
  const role = activeRole();
  const canManage = role !== null && (BREACH_ADMIN_ROLES as readonly string[]).includes(role);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nature, setNature] = useState<BreachNature[]>(['confidentiality']);
  const [discoveredAt, setDiscoveredAt] = useState(nowLocalInput());
  const [categories, setCategories] = useState<string[]>([]);
  const [affectedCount, setAffectedCount] = useState('');
  const [factors, setFactors] = useState<RiskFactors>(NO_RISK_FACTORS);
  const [consequences, setConsequences] = useState('');
  const [measures, setMeasures] = useState('');

  const suggestedRisk = useMemo(() => classifyRisk(factors), [factors]);

  const queue = useMemo(
    () => sortBreaches(breaches.filter((b) => b.asociatie_id === asociatieId)),
    [breaches, asociatieId],
  );
  const awaiting = useMemo(() => awaitingAuthorityCount(queue), [queue]);

  const doc = useMemo(() => breachProcedure(lang), [lang]);

  if (!canManage) {
    return (
      <div>
        <PageHeader title={t('breach.title')} subtitle={t('breach.subtitle')} />
        <Card>
          <EmptyState
            icon={<ShieldAlert size={22} />}
            title={t('breach.noAccessTitle')}
            body={t('breach.noAccessBody')}
          />
        </Card>
      </div>
    );
  }

  const toggleNature = (n: BreachNature) =>
    setNature((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  const toggleCategory = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  const reset = () => {
    setTitle('');
    setDescription('');
    setNature(['confidentiality']);
    setDiscoveredAt(nowLocalInput());
    setCategories([]);
    setAffectedCount('');
    setFactors(NO_RISK_FACTORS);
    setConsequences('');
    setMeasures('');
  };

  const submit = () => {
    if (!canSubmit) return;
    record(asociatieId, actorName, {
      title,
      description,
      nature,
      discoveredAt: toIso(discoveredAt),
      dataCategories: categories,
      affectedCount: Number(affectedCount) || 0,
      factors,
      consequences,
      measures,
    });
    reset();
    toast.success(t('breach.recorded'));
  };

  const downloadAuthority = (b: BreachRecord) => {
    download(`notificare-anspdcp-${b.id}.txt`, authorityNotification(lang, b, asociatieName));
    toast.success(t('breach.downloaded'));
  };
  const downloadSubjects = (b: BreachRecord) => {
    download(`informare-locatari-${b.id}.txt`, subjectNotice(lang, b, asociatieName));
    toast.success(t('breach.downloaded'));
  };

  return (
    <div>
      <PageHeader title={t('breach.title')} subtitle={`${asociatieName} · ${t('breach.subtitle')}`} />

      {awaiting > 0 && (
        <Card className="breach-alert">
          <Siren size={18} />
          <span>{t('breach.awaitingBanner', { count: awaiting })}</span>
        </Card>
      )}

      <Card title={t('breach.procedureTitle')}>
        <p className="dpa-doc__updated">{doc.updated}</p>
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>
          {doc.intro}
        </p>
        <ol className="breach-procedure">
          {doc.sections.map((s) => (
            <li key={s.heading}>
              <strong>{s.heading}</strong>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted">
                  {p}
                </p>
              ))}
            </li>
          ))}
        </ol>
      </Card>

      <Card title={t('breach.recordTitle')} className="mt-4">
        <div className="breach-form">
          <Input
            label={t('breach.fldTitle')}
            placeholder={t('breach.fldTitlePh')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label={t('breach.fldDescription')}
            placeholder={t('breach.fldDescriptionPh')}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="breach-form__row">
            <Input
              type="datetime-local"
              label={t('breach.fldDiscovered')}
              value={discoveredAt}
              onChange={(e) => setDiscoveredAt(e.target.value)}
            />
            <Input
              type="number"
              min={0}
              label={t('breach.fldAffected')}
              placeholder="0"
              value={affectedCount}
              onChange={(e) => setAffectedCount(e.target.value)}
            />
          </div>

          <fieldset className="breach-fieldset">
            <legend>{t('breach.natureLegend')}</legend>
            <div className="breach-cats">
              {BREACH_NATURES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="breach-cat"
                  data-on={nature.includes(n)}
                  aria-pressed={nature.includes(n)}
                  onClick={() => toggleNature(n)}
                >
                  {t(`breach.nature.${n}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="breach-fieldset">
            <legend>{t('breach.dataLegend')}</legend>
            <div className="breach-cats">
              {DATA_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="breach-cat"
                  data-on={categories.includes(c)}
                  aria-pressed={categories.includes(c)}
                  onClick={() => toggleCategory(c)}
                >
                  {t(`breach.data.${c}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="breach-fieldset">
            <legend>{t('breach.factorsLegend')}</legend>
            <ul className="breach-factors">
              {FACTOR_KEYS.map((k) => (
                <li key={k}>
                  <div>
                    <span className="breach-factor__name">{t(`breach.factor.${k}`)}</span>
                    <span className="breach-factor__hint text-sm text-muted">
                      {t(`breach.factorHint.${k}`)}
                    </span>
                  </div>
                  <Switch
                    checked={factors[k]}
                    onChange={(v) => setFactors((prev) => ({ ...prev, [k]: v }))}
                    label={t(`breach.factor.${k}`)}
                  />
                </li>
              ))}
            </ul>
            <p className="breach-suggested">
              <AlertTriangle size={14} />
              {t('breach.suggestedRisk')}{' '}
              <Badge tone={RISK_TONE[suggestedRisk]}>{t(`breach.risk.${suggestedRisk}`)}</Badge>
              <span className="text-sm text-muted">
                {requiresSubjectNotification(suggestedRisk)
                  ? t('breach.needAuthorityAndSubjects')
                  : requiresAuthorityNotification(suggestedRisk)
                    ? t('breach.needAuthority')
                    : t('breach.needNone')}
              </span>
            </p>
          </fieldset>

          <Textarea
            label={t('breach.fldConsequences')}
            placeholder={t('breach.fldConsequencesPh')}
            rows={2}
            value={consequences}
            onChange={(e) => setConsequences(e.target.value)}
          />
          <Textarea
            label={t('breach.fldMeasures')}
            placeholder={t('breach.fldMeasuresPh')}
            rows={2}
            value={measures}
            onChange={(e) => setMeasures(e.target.value)}
          />

          <div>
            <Button onClick={submit} disabled={!canSubmit}>
              <FileWarning size={15} /> {t('breach.record')}
            </Button>
          </div>
        </div>
      </Card>

      <Card title={t('breach.logTitle')} className="mt-4">
        {queue.length === 0 ? (
          <EmptyState icon={<CalendarClock size={22} />} body={t('breach.logEmpty')} />
        ) : (
          <ul className="breach-log">
            {queue.map((b) => {
              const ds = deadlineState(b);
              const hours = hoursToDeadline(b);
              const next = nextStatus(b.status);
              return (
                <li key={b.id} className="breach-log__row" data-open={isOpen(b)}>
                  <div className="breach-log__head">
                    <span className="breach-log__title">{b.title}</span>
                    <Badge tone={RISK_TONE[b.risk]}>{t(`breach.risk.${b.risk}`)}</Badge>
                    <Badge tone="neutral">{t(`breach.status.${b.status}`)}</Badge>
                    {requiresAuthorityNotification(b.risk) && (
                      <Badge tone={DEADLINE_TONE[ds]}>
                        {ds === 'overdue'
                          ? t('breach.deadlineOverdue')
                          : ds === 'done'
                            ? t('breach.deadlineDone')
                            : t('breach.deadlineIn', { hours })}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted breach-log__desc">{b.description}</p>
                  <p className="text-sm text-muted">
                    {t('breach.discovered')}: {formatDateTime(b.discovered_at)}
                    {b.affected_count > 0 && ` · ${t('breach.affected', { count: b.affected_count })}`}
                    {b.reported_by && ` · ${t('breach.by', { name: b.reported_by })}`}
                  </p>

                  <div className="breach-log__actions">
                    <Button variant="secondary" onClick={() => downloadAuthority(b)}>
                      <FileDown size={15} /> {t('breach.dlAuthority')}
                    </Button>
                    {requiresSubjectNotification(b.risk) && (
                      <Button variant="secondary" onClick={() => downloadSubjects(b)}>
                        <Users size={15} /> {t('breach.dlSubjects')}
                      </Button>
                    )}
                    {requiresAuthorityNotification(b.risk) && !b.authority_notified_at && (
                      <Button onClick={() => notifyAuthority(b.id)}>
                        <Check size={15} /> {t('breach.markAuthority')}
                      </Button>
                    )}
                    {requiresSubjectNotification(b.risk) && !b.subjects_notified_at && (
                      <Button onClick={() => notifySubjects(b.id)}>
                        <Check size={15} /> {t('breach.markSubjects')}
                      </Button>
                    )}
                    {next && (
                      <Button variant="ghost" onClick={() => advance(b.id)}>
                        <ArrowRight size={15} /> {t(`breach.advanceTo.${next}`)}
                      </Button>
                    )}
                  </div>

                  {(b.authority_notified_at || b.subjects_notified_at) && (
                    <p className="text-sm text-muted breach-log__trail">
                      {b.authority_notified_at &&
                        `${t('breach.authorityNotifiedAt')}: ${formatDateTime(b.authority_notified_at)}`}
                      {b.authority_notified_at && b.subjects_notified_at && ' · '}
                      {b.subjects_notified_at &&
                        `${t('breach.subjectsNotifiedAt')}: ${formatDateTime(b.subjects_notified_at)}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
