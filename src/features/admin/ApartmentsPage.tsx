import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, Building2, Download, KeyRound, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatLei } from '@/shared/lib/format';
import { generateInviteCode } from '@/shared/lib/inviteCode';
import {
  generateApartmentsCsvTemplate,
  parseApartmentsCsv,
  resolveImportBatch,
  rowToApartment,
} from '@/shared/lib/csv';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import type { Apartment } from '@/shared/types/domain';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { sendInviteEmail } from '@/features/invites/inviteEmailApi';
import { onboardingExpiry } from '@/features/invites/inviteLogic';
import { useAsociatieApartments, useApartmentsStore } from './apartmentsStore';
import { createApartments, deleteApartment, hydrateApartments } from './apartmentsApi';

export default function ApartmentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const apartments = useAsociatieApartments();
  const [pendingDelete, setPendingDelete] = useState<Apartment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // With a backend present, pull the live registry into the store on mount; in
  // demo mode this is a no-op and the seeded/persisted list stands.
  useEffect(() => {
    if (asociatieId) void hydrateApartments(asociatieId);
  }, [asociatieId]);

  const handleDownloadTemplate = () => {
    const csv = generateApartmentsCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sablon-apartamente.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !asociatieId) return;

    setIsImporting(true);
    setImportErrors([]);

    try {
      const text = await file.text();
      const { rows, errors: parseErrors } = parseApartmentsCsv(text);

      const existing = useApartmentsStore.getState().forAsociatie(asociatieId);
      const existingKeys = new Set(
        existing.map((a) => `${a.scara ?? ''}|${a.numar_apartament}`),
      );

      const { toCreate, toInvite, errors } = resolveImportBatch(rows, parseErrors, existingKeys);

      const newApartments = toCreate.map((row) => rowToApartment(row, asociatieId));
      if (newApartments.length > 0) {
        createApartments(asociatieId, newApartments);
      }

      let invitesSent = 0;
      const inviteState = useInviteStore.getState();

      for (const row of toInvite) {
        const idx = toCreate.indexOf(row);
        const aptId = idx !== -1 ? newApartments[idx].id : null;
        const invite = inviteState.issue({
          asociatieId,
          role: row.proprietar ? 'proprietar' : 'chirias',
          apartmentId: aptId,
          expiresAt: onboardingExpiry(),
          singleUse: true,
          inviteeName: row.name || null,
          inviteeEmail: row.email,
        });
        const result = await sendInviteEmail({ invite, locale: i18n.language });
        if (result.ok) {
          inviteState.markEmailSent(invite.id);
          invitesSent++;
        }
      }

      if (newApartments.length > 0) {
        toast.success(
          t('apartments.importSuccess', {
            apartments: newApartments.length,
            invites: invitesSent,
          }),
        );
      } else if (errors.length === 0) {
        toast(t('apartments.importNone'));
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDelete = () => {
    if (!asociatieId || !pendingDelete) return;
    deleteApartment(asociatieId, pendingDelete);
    toast.success(t('apartments.deleted', { label: apartmentShortLabel(pendingDelete) }));
    setPendingDelete(null);
  };

  return (
    <div>
      <PageHeader
        title={t('apartments.title')}
        subtitle={t('apartments.subtitle')}
        action={
          apartments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/app/admin/cladire')}>
                <Building2 className="h-4 w-4" /> {t('building.title')}
              </Button>
              <Button variant="secondary" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4" /> {t('apartments.downloadTemplate')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleImportClick}
                loading={isImporting}
                aria-label={t('apartments.importList')}
              >
                <Upload className="h-4 w-4" /> {t('apartments.importList')}
              </Button>
              <Button onClick={() => navigate('/app/admin/apartamente/adauga')}>
                <Plus className="h-4 w-4" /> {t('apartments.addApartments')}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden="true"
        onChange={handleFileSelected}
      />

      {/* Per-row import errors */}
      {importErrors.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-yellow-500"
                aria-hidden
              />
              <div className="text-sm">
                <p className="font-medium text-yellow-700 dark:text-yellow-300">
                  {t('apartments.importErrorsTitle', { count: importErrors.length })}
                </p>
                <ul className="mt-1 space-y-0.5 text-yellow-700/80 dark:text-yellow-300/80">
                  {importErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setImportErrors([])}
              className="iconbtn shrink-0"
              style={{ width: 28, height: 28 }}
              aria-label={t('common.close')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {apartments.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          title={t('apartments.firstSetupTitle')}
          body={t('apartments.firstSetupBody')}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('/app/admin/apartamente/adauga')}>
                <Plus className="h-4 w-4" /> {t('apartments.addApartments')}
              </Button>
              <Button variant="secondary" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4" /> {t('apartments.downloadTemplate')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleImportClick}
                loading={isImporting}
              >
                <Upload className="h-4 w-4" /> {t('apartments.importList')}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/app/admin/cladire')}>
                <Building2 className="h-4 w-4" /> {t('apartments.configureBuilding')}
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th className="px-4 py-2">{t('apartments.scara')}</th>
                  <th className="px-4 py-2">{t('apartments.etaj')}</th>
                  <th className="px-4 py-2">{t('apartments.number')}</th>
                  <th className="px-4 py-2">{t('apartments.owner')}</th>
                  <th className="px-4 py-2">{t('apartments.area')}</th>
                  <th className="px-4 py-2">{t('apartments.share')}</th>
                  <th className="px-4 py-2">{t('apartments.persons')}</th>
                  <th className="px-4 py-2 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {apartments.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-2">{a.scara}</td>
                    <td className="px-4 py-2">{a.etaj === 0 ? t('apartments.parter') : a.etaj}</td>
                    <td className="px-4 py-2 font-medium">{a.numar_apartament}</td>
                    <td className="px-4 py-2">{a.proprietar_principal_name}</td>
                    <td className="px-4 py-2">{a.suprafata_utila} m²</td>
                    <td className="px-4 py-2">
                      {a.cota_parte_indiviza
                        ? `${(a.cota_parte_indiviza * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                    <td className="px-4 py-2">{a.numar_persoane}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          className="iconbtn"
                          style={{ width: 32, height: 32 }}
                          aria-label={t('apartments.edit', { label: apartmentShortLabel(a) })}
                          onClick={() => navigate(`/app/admin/apartamente/${a.id}`)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="iconbtn"
                          style={{ width: 32, height: 32 }}
                          aria-label={t('apartments.deleteLabel', { label: apartmentShortLabel(a) })}
                          onClick={() => setPendingDelete(a)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 sm:hidden">
            {apartments.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      Ap. {a.numar_apartament} · Sc. {a.scara} · Et.{' '}
                      {a.etaj === 0 ? 'P' : a.etaj}
                    </p>
                    <p className="text-muted">{a.proprietar_principal_name}</p>
                    <p className="text-sm text-muted">
                      {a.suprafata_utila} m² · cotă{' '}
                      {(Number(a.cota_parte_indiviza) * 100).toFixed(1)}% · {a.numar_persoane}{' '}
                      {t('apartments.persons').toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="iconbtn"
                      style={{ width: 32, height: 32 }}
                      aria-label={t('apartments.edit', { label: apartmentShortLabel(a) })}
                      onClick={() => navigate(`/app/admin/apartamente/${a.id}`)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="iconbtn"
                      style={{ width: 32, height: 32 }}
                      aria-label={t('apartments.deleteLabel', { label: apartmentShortLabel(a) })}
                      onClick={() => setPendingDelete(a)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {t('apartments.monthlyFund', {
                amount: formatLei(
                  apartments.reduce((s, a) => s + (a.suprafata_utila ?? 0) * 0.8, 0),
                ),
              })}
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                const codes = apartments.map(() => generateInviteCode());
                toast.success(t('apartments.codesGenerated', { count: codes.length, code: codes[0] }));
              }}
            >
              <KeyRound className="h-4 w-4" /> {t('apartments.generateCodes')}
            </Button>
          </div>
        </>
      )}

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t('apartments.deleteTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {pendingDelete
            ? t('apartments.deleteConfirm', { label: apartmentShortLabel(pendingDelete) })
            : ''}
        </p>
      </Modal>

      <p className="mt-4 text-center text-sm sm:hidden">
        <Link to="/app/admin/cladire" className="auth-link">
          {t('building.title')}
        </Link>
      </p>
    </div>
  );
}
