import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ClipboardList, Download, FileDown, FileJson, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { useAuthStore } from '@/shared/store/authStore';
import { FEATURE_MAP, featureDescription, featureTitle } from '@/shared/features/registry';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import type { Lang } from './legalContent';
import { dpaTemplate, dpaToText } from './dpaContent';
import {
  ROPA_SUBJECTS_KEY,
  buildRopa,
  ropaToCsv,
  ropaToJson,
  type ProcessingActivity,
} from './ropaLogic';

function download(filename: string, contents: string, mime: string) {
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

/** Roles allowed to view the processing register + DPA (mirrors the data-controller role). */
const ROPA_ADMIN_ROLES = ['admin', 'presedinte'] as const;

/**
 * Admin surface for the GDPR accountability documents (T21): the Data
 * Processing Agreement template (art. 28) and the per-asociație Record of
 * Processing Activities (art. 30), generated from the enabled features and
 * exportable as JSON/CSV. Only the controller roles (admin / president) see it.
 */
export default function ProcessingRecordsPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language.startsWith('en') ? 'en' : 'ro';

  const activeRole = useAuthStore((s) => s.activeRole);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const localAsociatii = useAuthStore((s) => s.localAsociatii);
  const flags = useAsociatieFlags();

  const role = activeRole();
  const canView = role !== null && (ROPA_ADMIN_ROLES as readonly string[]).includes(role);

  const asociatieName =
    localAsociatii.find((a) => a.id === currentAsociatieId)?.name ?? DEMO_ASOCIATIE.name;

  const enabledKeys = useMemo(
    () => Object.entries(flags).filter(([, on]) => on).map(([k]) => k),
    [flags],
  );
  const activities = useMemo(() => buildRopa(enabledKeys), [enabledKeys]);

  const doc = useMemo(() => dpaTemplate(lang, asociatieName), [lang, asociatieName]);

  if (!canView) {
    return (
      <div>
        <PageHeader title={t('ropa.title')} subtitle={t('ropa.subtitle')} />
        <Card>
          <div className="ropa-noaccess">
            <ShieldAlert size={22} />
            <div>
              <p className="ropa-noaccess__title">{t('ropa.noAccessTitle')}</p>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                {t('ropa.noAccessBody')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const activityTitle = (a: ProcessingActivity): string =>
    a.kind === 'feature' && a.featureKey
      ? featureTitle(t, FEATURE_MAP[a.featureKey])
      : t(a.titleKey ?? '');

  const activityPurpose = (a: ProcessingActivity): string =>
    a.kind === 'feature' && a.featureKey
      ? featureDescription(t, FEATURE_MAP[a.featureKey])
      : t(a.purposeKey ?? '');

  const dataLabels = (a: ProcessingActivity) => a.data.map((d) => t(`ropa.data.${d}`));
  const recipientLabels = (a: ProcessingActivity) => a.recipients.map((r) => t(r));

  /** Localized flat rows for export, keyed by the column labels. */
  const exportRows = (): Record<string, string>[] =>
    activities.map((a) => ({
      [t('ropa.colActivity')]: activityTitle(a),
      [t('ropa.colPurpose')]: activityPurpose(a),
      [t('ropa.colData')]: dataLabels(a).join('; '),
      [t('ropa.colSubjects')]: t(ROPA_SUBJECTS_KEY),
      [t('ropa.colBasis')]: t(a.basisKey),
      [t('ropa.colRetention')]: t(a.retentionKey),
      [t('ropa.colRecipients')]: recipientLabels(a).join('; '),
    }));

  const meta = { asociatie: asociatieName, generatedAt: new Date().toISOString() };

  const exportJson = () => {
    download('registru-prelucrare.json', ropaToJson(meta, exportRows()), 'application/json;charset=utf-8');
    toast.success(t('ropa.exported'));
  };
  const exportCsv = () => {
    download('registru-prelucrare.csv', ropaToCsv(exportRows()), 'text/csv;charset=utf-8');
    toast.success(t('ropa.exported'));
  };
  const downloadDpa = () => {
    download('acord-prelucrare-date.txt', dpaToText(doc), 'text/plain;charset=utf-8');
    toast.success(t('ropa.dpaDownloaded'));
  };

  return (
    <div>
      <PageHeader title={t('ropa.title')} subtitle={`${asociatieName} · ${t('ropa.subtitle')}`} />

      <Card title={t('ropa.dpaTitle')}>
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>
          {t('ropa.dpaBody')}
        </p>
        <div className="ropa-roles">
          <span className="ropa-role">
            <Badge tone="neutral">{t('ropa.controller')}</Badge> {asociatieName}
          </span>
          <span className="ropa-role">
            <Badge tone="neutral">{t('ropa.processor')}</Badge> vecini.online
          </span>
        </div>
        <article className="dpa-doc">
          <p className="dpa-doc__updated">{doc.updated}</p>
          <p className="dpa-doc__intro">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.heading} className="dpa-doc__section">
              <h3 className="dpa-doc__heading">{s.heading}</h3>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="dpa-doc__p">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" onClick={downloadDpa}>
            <FileDown size={15} /> {t('ropa.downloadDpa')}
          </Button>
        </div>
      </Card>

      <Card title={t('ropa.registerTitle')} className="mt-4">
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>
          {t('ropa.registerBody')}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Button onClick={exportJson}>
            <FileJson size={15} /> {t('gdpr.downloadJson')}
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            <FileSpreadsheet size={15} /> {t('gdpr.downloadCsv')}
          </Button>
        </div>

        <div className="ropa-table" role="table" aria-label={t('ropa.registerTitle')}>
          <div className="ropa-table__row ropa-table__row--head" role="row">
            <span role="columnheader">{t('ropa.colActivity')}</span>
            <span role="columnheader">{t('ropa.colData')}</span>
            <span role="columnheader">{t('ropa.colBasis')}</span>
            <span role="columnheader">{t('ropa.colRetention')}</span>
            <span role="columnheader">{t('ropa.colRecipients')}</span>
          </div>
          {activities.map((a) => (
            <div key={a.id} className="ropa-table__row" role="row">
              <span role="cell">
                <span className="ropa-table__name">
                  {a.kind === 'feature' ? <ClipboardList size={13} /> : <Download size={13} />}
                  {activityTitle(a)}
                </span>
                <span className="ropa-table__purpose text-muted">{activityPurpose(a)}</span>
              </span>
              <span role="cell" className="ropa-table__tags">
                {dataLabels(a).map((d) => (
                  <Badge key={d} tone="neutral">
                    {d}
                  </Badge>
                ))}
              </span>
              <span role="cell">{t(a.basisKey)}</span>
              <span role="cell" className="text-muted">
                {t(a.retentionKey)}
              </span>
              <span role="cell" className="text-muted">
                {recipientLabels(a).join(', ')}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 10 }}>
          {t('ropa.subjectsNote', { subjects: t(ROPA_SUBJECTS_KEY) })}
        </p>
      </Card>
    </div>
  );
}
