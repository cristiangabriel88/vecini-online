import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, Building2, ChevronDown, ChevronUp, Download, FileSpreadsheet, FileText, Loader2, Mail, Pencil, Plus, Send, Trash2, Upload, X } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import {
  generateApartmentsCsvTemplate,
  generateApartmentsXlsxTemplate,
  parseApartmentsCsv,
  parseApartmentsXlsx,
  resolveImportBatch,
  rowToApartment,
  type ImportResult,
} from '@/shared/lib/csv';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import type { Apartment, ApartmentPerson } from '@/shared/types/domain';
import type { InviteCode } from '@/features/invites/inviteLogic';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { inviteEmailErrorKey, sendInviteEmail } from '@/features/invites/inviteEmailApi';
import { writeInviteToLive } from '@/features/invites/inviteWriteApi';
import { onboardingExpiry } from '@/features/invites/inviteLogic';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { isValidEmail } from '@/features/auth/authLogic';
import { recordAudit } from '@/shared/store/auditStore';
import { useAsociatieApartments, useApartmentsStore } from './apartmentsStore';
import { createApartments, deleteApartment, hydrateApartments } from './apartmentsApi';

/** Return the consumed-at date for an apartment, or null if nobody has joined yet. */
function getJoinDate(apartmentId: string, invites: InviteCode[]): Date | null {
  const consumed = invites.find(
    (inv) => inv.apartmentId === apartmentId && inv.revokedAt === null && inv.consumedAt !== null,
  );
  return consumed?.consumedAt ? new Date(consumed.consumedAt) : null;
}

/** Status indicator shown in the apartments table. Green = joined, muted = pending.
 *  When onInviteClick is provided and the apartment has not yet joined, the icon
 *  becomes an interactive button that opens the invite flow directly. */
function ApartmentStatusCell({
  apartmentId,
  invites,
  onInviteClick,
}: {
  apartmentId: string;
  invites: InviteCode[];
  onInviteClick?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [tipOpen, setTipOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const joinDate = getJoinDate(apartmentId, invites);
  const locale = i18n.language === 'ro' ? 'ro-RO' : 'en-GB';
  const label = joinDate
    ? t('apartments.joinedOn', {
        date: joinDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
      })
    : t('apartments.statusNotRegistered');

  // When an invite button is present, the inner <button> handles interaction.
  // For static icons (joined/no-button), the wrapper must be keyboard-focusable
  // and tappable so touch/coarse-pointer users can read the status (WCAG 1.4.13).
  const hasButton = Boolean(onInviteClick && !joinDate);

  function handleWrapperClick() {
    if (!hasButton) setTipOpen((o) => !o);
  }

  function handleWrapperKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setTipOpen(false); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setTipOpen((o) => !o);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      setTipOpen(false);
    }
  }

  const notJoinedSvg = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Person */}
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      {/* Red X */}
      <line x1="18" y1="15" x2="22" y2="19" className="stroke-red-500 dark:stroke-red-400" strokeWidth="2.5" />
      <line x1="22" y1="15" x2="18" y2="19" className="stroke-red-500 dark:stroke-red-400" strokeWidth="2.5" />
    </svg>
  );

  return (
    <div
      ref={wrapperRef}
      className={[
        'relative inline-flex group/status',
        !hasButton ? 'cursor-help' : '',
      ].join(' ')}
      aria-label={!hasButton ? label : undefined}
      tabIndex={hasButton ? undefined : 0}
      onClick={!hasButton ? handleWrapperClick : undefined}
      onKeyDown={!hasButton ? handleWrapperKeyDown : undefined}
      onBlur={handleBlur}
    >
      {joinDate ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-500 dark:text-emerald-400"
          aria-hidden="true"
        >
          {/* Person */}
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          {/* Green checkmark */}
          <polyline points="17.5,17 19.5,19.5 23,14.5" strokeWidth="2.5" />
        </svg>
      ) : onInviteClick ? (
        <button
          type="button"
          onClick={onInviteClick}
          aria-label={t('apartments.sendInvite')}
          className={[
            'inline-flex cursor-pointer rounded-md p-0.5 text-muted',
            'transition-colors duration-150',
            'hover:text-[hsl(var(--color-accent))] hover:bg-[hsl(var(--color-accent)/0.08)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent)/0.5)]',
          ].join(' ')}
        >
          {notJoinedSvg}
        </button>
      ) : (
        <span className="text-muted">{notJoinedSvg}</span>
      )}

      {/* Tooltip: visible on hover, keyboard focus-within, or tap-toggle (WCAG 1.4.13) */}
      <span
        role="tooltip"
        aria-hidden="true"
        className={[
          'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
          'whitespace-nowrap rounded-lg border border-border bg-surface-2 px-2.5 py-1',
          'text-xs font-medium shadow-sm',
          joinDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted',
          tipOpen
            ? 'opacity-100'
            : 'opacity-0 group-hover/status:opacity-100 group-focus-within/status:opacity-100',
          'transition-opacity duration-150',
          'z-20',
        ].join(' ')}
      >
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
      </span>
    </div>
  );
}

export default function ApartmentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const asociatieName = useAuthStore(
    (s) => s.localAsociatii.find((a) => a.id === s.currentAsociatieId)?.name ?? '',
  );
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const apartments = useAsociatieApartments();
  const invites = useInviteStore((s) =>
    asociatieId ? s.forAsociatie(asociatieId) : [],
  );
  const issue = useInviteStore((s) => s.issue);
  const markEmailSent = useInviteStore((s) => s.markEmailSent);
  const [pendingDelete, setPendingDelete] = useState<Apartment | null>(null);
  const [showInviteConfirm, setShowInviteConfirm] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingXlsxTemplate, setIsDownloadingXlsxTemplate] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  // Quick-invite modal state: apartment selected from the status-column icon.
  const [inviteApt, setInviteApt] = useState<Apartment | null>(null);
  const [quickSelectedEmail, setQuickSelectedEmail] = useState('');
  const [quickCustomEmail, setQuickCustomEmail] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  type SortKey = 'scara' | 'etaj' | 'numar_apartament' | 'proprietar_principal_name' | 'suprafata_utila' | 'cota_parte_indiviza' | 'numar_persoane';
  type SortDir = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const selectAllRef = useRef<HTMLInputElement>(null);

  const sortedApartments = useMemo(() => {
    if (!sortKey) return apartments;
    return [...apartments].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), 'ro');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [apartments, sortKey, sortDir]);

  const allSelected = apartments.length > 0 && selectedIds.size === apartments.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(apartments.map((a) => a.id)));
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp className="inline h-3 w-3 ml-0.5" /> : <ChevronDown className="inline h-3 w-3 ml-0.5" />
    ) : (
      <span className="inline-flex flex-col ml-0.5 opacity-30" style={{ gap: 0 }}>
        <ChevronUp className="h-2.5 w-2.5" style={{ marginBottom: -2 }} />
        <ChevronDown className="h-2.5 w-2.5" />
      </span>
    );

  const confirmBulkDelete = () => {
    if (!asociatieId) return;
    const count = selectedIds.size;
    for (const id of selectedIds) {
      const apt = apartments.find((a) => a.id === id);
      if (apt) deleteApartment(asociatieId, apt, () => {});
    }
    toast.success(t('apartments.deletedSelected', { count }));
    setSelectedIds(new Set());
    setPendingBulkDelete(false);
  };

  /** Apartments eligible for bulk invite: at least one person with email, not yet joined. */
  const eligibleApartments = apartments.filter((apt) => {
    const hasEmail = apt.persons.some((p) => p.email && p.email.trim().length > 0);
    const alreadyJoined = getJoinDate(apt.id, invites) !== null;
    return hasEmail && !alreadyJoined;
  });

  /** Persons with a valid email for the currently-open quick-invite apartment. */
  const quickEmailPersons: (ApartmentPerson & { email: string })[] = inviteApt
    ? (inviteApt.persons.filter(
        (p): p is ApartmentPerson & { email: string } =>
          Boolean(p.email?.trim()) && isValidEmail(p.email!),
      ))
    : [];

  /** Open the quick-invite modal for an apartment; pre-select the primary person's email. */
  const openQuickInvite = (apt: Apartment) => {
    const primaryPerson = apt.persons.find((p) => p.is_primary) ?? apt.persons[0];
    setQuickSelectedEmail(primaryPerson?.email ?? '');
    setQuickCustomEmail('');
    setInviteApt(apt);
  };

  /** Issue and deliver invites for all eligible apartments in one batch. */
  const onBulkInviteConfirm = async () => {
    if (!asociatieId || eligibleApartments.length === 0) return;
    setIsBulkSending(true);
    let sentCount = 0;
    let failedCount = 0;
    for (const apt of eligibleApartments) {
      const primaryEmail = apt.persons.find((p) => p.email && p.email.trim())?.email;
      if (!primaryEmail) { failedCount++; continue; }
      const primaryName =
        apt.persons.find((p) => p.is_primary)?.name ??
        apt.persons[0]?.name ??
        apt.proprietar_principal_name ??
        '';
      const invite = issue({
        asociatieId,
        asociatieName,
        role: 'proprietar',
        apartmentId: apt.id,
        expiresAt: onboardingExpiry(),
        singleUse: true,
        createdBy: userId,
        inviteeName: primaryName || null,
        inviteeEmail: primaryEmail,
      });
      recordAudit({
        action: 'invite.issued',
        entity: 'invite',
        entity_label: invite.code,
        before: null,
        after: invite.role,
      });
      if (isSupabaseConfigured) {
        const writeResult = await writeInviteToLive(invite);
        if (!writeResult.ok) {
          console.warn('[invite-email] write failed:', writeResult.error);
          failedCount++;
          continue;
        }
      }
      const result = await sendInviteEmail({ invite, locale: i18n.language });
      if (!result.ok) console.warn('[invite-email] send failed:', result.error);
      if (result.ok) {
        markEmailSent(invite.id);
        recordAudit({
          action: 'invite.email_sent',
          entity: 'invite',
          entity_label: invite.code,
          before: null,
          after: null,
        });
        sentCount++;
      } else {
        failedCount++;
      }
    }
    setIsBulkSending(false);
    setShowInviteConfirm(false);
    if (sentCount > 0) toast.success(t('apartments.generateInvitesSent', { count: sentCount }));
    if (failedCount > 0) toast.error(t('apartments.generateInvitesFailed', { count: failedCount }));
  };

  /** Mint the invite and deliver it, mirroring the same flow as ApartmentFormPage. */
  const onQuickInviteConfirm = async () => {
    if (!inviteApt || !asociatieId) return;
    const effectiveEmail = quickCustomEmail.trim() || quickSelectedEmail;
    if (!isValidEmail(effectiveEmail)) {
      toast.error(t('apartments.emailInvalid'));
      return;
    }
    const primaryName =
      inviteApt.persons.find((p) => p.is_primary)?.name ??
      inviteApt.persons[0]?.name ??
      inviteApt.proprietar_principal_name ??
      '';
    const invite = issue({
      asociatieId,
      asociatieName,
      role: 'proprietar',
      apartmentId: inviteApt.id,
      expiresAt: null,
      singleUse: true,
      createdBy: userId,
      inviteeName: primaryName || null,
      inviteeEmail: effectiveEmail,
    });
    recordAudit({
      action: 'invite.issued',
      entity: 'invite',
      entity_label: invite.code,
      before: null,
      after: invite.role,
    });
    if (isSupabaseConfigured) {
      const writeResult = await writeInviteToLive(invite);
      if (!writeResult.ok) {
        console.warn('[invite-email] write failed:', writeResult.error);
        toast.error(t(inviteEmailErrorKey('invite-not-found')));
        return;
      }
    }
    const result = await sendInviteEmail({ invite, locale: i18n.language });
    if (!result.ok) {
      console.warn('[invite-email] send failed:', result.error);
      toast.error(t(inviteEmailErrorKey(result.error)));
      return;
    }
    markEmailSent(invite.id);
    recordAudit({
      action: 'invite.email_sent',
      entity: 'invite',
      entity_label: invite.code,
      before: null,
      after: null,
    });
    toast.success(t('apartments.emailSent', { email: effectiveEmail }));
    setInviteApt(null);
  };

  // With a backend present, pull the live registry into the store on mount; in
  // demo mode this is a no-op and the seeded/persisted list stands.
  useEffect(() => {
    if (asociatieId) void hydrateApartments(asociatieId);
  }, [asociatieId]);

  // Close the download dropdown when clicking outside it
  useEffect(() => {
    if (!showDownloadDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(e.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadDropdown]);

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

  const handleDownloadExcel = async () => {
    setIsDownloadingXlsxTemplate(true);
    try {
      const bytes = await generateApartmentsXlsxTemplate();
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sablon-apartamente.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingXlsxTemplate(false);
      setShowDownloadDropdown(false);
    }
  };

  const handleExportApartmentsExcel = async () => {
    setIsExportingXlsx(true);
    try {
      const XLSX = await import('xlsx');
      const headers = [
        t('apartments.scara'),
        t('apartments.etaj'),
        t('apartments.number'),
        t('apartments.owner'),
        t('apartments.area'),
        t('apartments.share'),
        t('apartments.persons'),
        t('apartments.statusHeader'),
      ];
      const rows = sortedApartments.map((a) => {
        const joinDate = getJoinDate(a.id, invites);
        return [
          a.scara ?? '',
          a.etaj === 0 ? t('apartments.parter') : (a.etaj ?? ''),
          a.numar_apartament,
          a.proprietar_principal_name ?? '',
          a.suprafata_utila ?? '',
          a.cota_parte_indiviza != null ? `${(a.cota_parte_indiviza * 100).toFixed(1)}%` : '',
          a.numar_persoane,
          joinDate
            ? t('apartments.joinedOn', { date: joinDate.toLocaleDateString() })
            : t('apartments.statusNotRegistered'),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('apartments.title'));
      const raw = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer | Uint8Array | number[];
      const view = new Uint8Array(raw as ArrayBuffer);
      const out = new Uint8Array(view.length);
      out.set(view);
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'apartamente.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingXlsx(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !asociatieId) return;

    setIsImporting(true);
    setImportErrors([]);
    setImportWarnings([]);

    try {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const parsed: ImportResult = isExcel
        ? await parseApartmentsXlsx(await file.arrayBuffer())
        : parseApartmentsCsv(await file.text());
      const { rows, errors: parseErrors } = parsed;

      const existing = useApartmentsStore.getState().forAsociatie(asociatieId);
      const existingKeys = new Set(
        existing.map((a) => `${a.scara ?? ''}|${a.numar_apartament}`),
      );

      const { toCreate, toInvite, errors, warnings } = resolveImportBatch(rows, parseErrors, existingKeys);

      const newApartments = toCreate.map((row) => rowToApartment(row, asociatieId));
      if (newApartments.length > 0) {
        const created = await createApartments(asociatieId, newApartments, (err) => {
          toast.error(t(err === 'conflict' ? 'apartments.conflictError' : 'apartments.saveFailed'));
        });
        if (!created) return;
      }

      let invitesSent = 0;
      const inviteState = useInviteStore.getState();

      for (const row of toInvite) {
        const idx = toCreate.indexOf(row);
        const aptId = idx !== -1 ? newApartments[idx].id : null;
        const invite = inviteState.issue({
          asociatieId,
          asociatieName,
          role: row.proprietar ? 'proprietar' : 'locatar',
          apartmentId: aptId,
          expiresAt: onboardingExpiry(),
          singleUse: true,
          inviteeName: row.name || null,
          inviteeEmail: row.email,
        });
        // Live path: persist the invite row to Supabase so the invite-email
        // function can look it up by id. Best-effort: failure does not block
        // email delivery or the import. Note: the function currently expects
        // the raw local id (invite.id = 'inv-{uuid}'); writeInviteToLive stores
        // only the uuid part as the DB primary key. The function will need an
        // update to strip the prefix for lookup -- tracked in the T55 done note.
        if (isSupabaseConfigured) {
          await writeInviteToLive(invite);
        }
        const result = await sendInviteEmail({ invite, locale: i18n.language });
        if (result.ok) {
          inviteState.markEmailSent(invite.id);
          invitesSent++;
        }
      }

      if (newApartments.length > 0) {
        toast.success(
          `${t('apartments.importSuccessApts', { count: newApartments.length })}, ${t('apartments.importSuccessInvites', { count: invitesSent })}.`,
        );
      } else if (errors.length === 0) {
        toast(t('apartments.importNone'));
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      }
      if (warnings.length > 0) {
        setImportWarnings(warnings);
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDelete = () => {
    if (!asociatieId || !pendingDelete) return;
    deleteApartment(asociatieId, pendingDelete, (_err) => {
      toast.error(t('apartments.saveFailed'));
    });
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
              {/* Download template split-button with CSV / Excel dropdown */}
              <div className="relative" ref={downloadDropdownRef}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDownloadDropdown((v) => !v)}
                  aria-expanded={showDownloadDropdown}
                  aria-haspopup="menu"
                >
                  <Download className="h-4 w-4" />
                  {t('apartments.downloadTemplate')}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${showDownloadDropdown ? 'rotate-180' : ''}`}
                  />
                </Button>
                {showDownloadDropdown && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-surface shadow-md z-20"
                  >
                    <button
                      role="menuitem"
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-surface-2"
                      onClick={() => { handleDownloadTemplate(); setShowDownloadDropdown(false); }}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted" />
                      CSV
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
                      onClick={handleDownloadExcel}
                      disabled={isDownloadingXlsxTemplate}
                    >
                      {isDownloadingXlsxTemplate ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted" />
                      )}
                      Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>

              <Button variant="secondary" onClick={handleExportApartmentsExcel} loading={isExportingXlsx}>
                <FileSpreadsheet className="h-4 w-4" /> {t('apartments.exportList')}
              </Button>

              <Button
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
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        aria-hidden="true"
        onChange={handleFileSelected}
      />

      {/* Blocking import errors -- row was rejected */}
      {importErrors.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-400/40 bg-red-400/10 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-red-500"
                aria-hidden
              />
              <div className="text-sm">
                <p className="font-medium text-red-700 dark:text-red-300">
                  {t('apartments.importErrorsTitle', { count: importErrors.length })}
                </p>
                <ul className="mt-1 space-y-0.5 text-red-700/80 dark:text-red-300/80">
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

      {/* Non-blocking import warnings -- apartment created, something skipped */}
      {importWarnings.length > 0 && (
        <div
          role="status"
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
                  {t('apartments.importWarningsTitle', { count: importWarnings.length })}
                </p>
                <ul className="mt-1 space-y-0.5 text-yellow-700/80 dark:text-yellow-300/80">
                  {importWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setImportWarnings([])}
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

              {/* Download template split-button with CSV / Excel dropdown */}
              <div className="relative" ref={downloadDropdownRef}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDownloadDropdown((v) => !v)}
                  aria-expanded={showDownloadDropdown}
                  aria-haspopup="menu"
                >
                  <Download className="h-4 w-4" />
                  {t('apartments.downloadTemplate')}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${showDownloadDropdown ? 'rotate-180' : ''}`}
                  />
                </Button>
                {showDownloadDropdown && (
                  <div
                    role="menu"
                    className="absolute left-1/2 -translate-x-1/2 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-surface shadow-md z-20"
                  >
                    <button
                      role="menuitem"
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-surface-2"
                      onClick={() => { handleDownloadTemplate(); setShowDownloadDropdown(false); }}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted" />
                      CSV
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
                      onClick={handleDownloadExcel}
                      disabled={isDownloadingXlsxTemplate}
                    >
                      {isDownloadingXlsxTemplate ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted" />
                      )}
                      Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={handleImportClick}
                loading={isImporting}
              >
                <Upload className="h-4 w-4" /> {t('apartments.importList')}
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
                  <th className="w-10 px-3 py-2">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label={allSelected ? t('apartments.deselectAll') : t('apartments.selectAll')}
                      className="h-4 w-4 cursor-pointer rounded accent-[hsl(var(--color-accent))]"
                    />
                  </th>
                  {(
                    [
                      ['scara', t('apartments.scara')],
                      ['etaj', t('apartments.etaj')],
                      ['numar_apartament', t('apartments.number')],
                      ['proprietar_principal_name', t('apartments.owner')],
                      ['suprafata_utila', t('apartments.area')],
                      ['cota_parte_indiviza', t('apartments.share')],
                      ['numar_persoane', t('apartments.persons')],
                    ] as [SortKey, string][]
                  ).map(([col, label]) => (
                    <th
                      key={col}
                      className="px-4 py-2 select-none cursor-pointer whitespace-nowrap hover:text-foreground transition-colors duration-150"
                      onClick={() => toggleSort(col)}
                    >
                      {label}
                      <SortIcon col={col} />
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center">{t('apartments.statusHeader')}</th>
                  <th className="px-4 py-2 text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedApartments.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-t border-border transition-colors duration-100 ${selectedIds.has(a.id) ? 'bg-[hsl(var(--color-accent)/0.06)]' : ''}`}
                  >
                    <td className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        aria-label={t('apartments.edit', { label: apartmentShortLabel(a) })}
                        className="h-4 w-4 cursor-pointer rounded accent-[hsl(var(--color-accent))]"
                      />
                    </td>
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
                      <div className="flex justify-center">
                        <ApartmentStatusCell
                          apartmentId={a.id}
                          invites={invites}
                          onInviteClick={() => openQuickInvite(a)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center gap-1.5">
                        <button
                          className="row-action-btn"
                          style={{
                            background: 'var(--primary-soft)',
                            border: '1px solid var(--accent-200)',
                            color: 'var(--primary-soft-text)',
                            boxShadow: 'var(--shadow-xs)',
                          }}
                          aria-label={t('apartments.edit', { label: apartmentShortLabel(a) })}
                          onClick={() => navigate(`/app/admin/apartamente/${a.id}`)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="row-action-btn"
                          style={{
                            background: 'var(--danger-soft)',
                            border: '1px solid oklch(58% 0.18 25 / 0.22)',
                            color: 'var(--danger-text)',
                            boxShadow: 'var(--shadow-xs)',
                          }}
                          aria-label={t('apartments.deleteLabel', { label: apartmentShortLabel(a) })}
                          onClick={() => setPendingDelete(a)}
                        >
                          <Trash2 size={13} />
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
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        Ap. {a.numar_apartament} · Sc. {a.scara} · Et.{' '}
                        {a.etaj === 0 ? 'P' : a.etaj}
                      </p>
                      <ApartmentStatusCell
                          apartmentId={a.id}
                          invites={invites}
                          onInviteClick={() => openQuickInvite(a)}
                        />
                    </div>
                    <p className="text-muted">{a.proprietar_principal_name}</p>
                    <p className="text-sm text-muted">
                      {a.suprafata_utila} m² · cotă{' '}
                      {(Number(a.cota_parte_indiviza) * 100).toFixed(1)}% · {a.numar_persoane}{' '}
                      {t('apartments.persons').toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      className="row-action-btn"
                      style={{
                        background: 'var(--primary-soft)',
                        border: '1px solid var(--accent-200)',
                        color: 'var(--primary-soft-text)',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                      aria-label={t('apartments.edit', { label: apartmentShortLabel(a) })}
                      onClick={() => navigate(`/app/admin/apartamente/${a.id}`)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="row-action-btn"
                      style={{
                        background: 'var(--danger-soft)',
                        border: '1px solid oklch(58% 0.18 25 / 0.22)',
                        color: 'var(--danger-text)',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                      aria-label={t('apartments.deleteLabel', { label: apartmentShortLabel(a) })}
                      onClick={() => setPendingDelete(a)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="danger"
                  onClick={() => setPendingBulkDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('apartments.deleteSelected', { count: selectedIds.size })}
                </Button>
              )}
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowInviteConfirm(true)}
              className="invite-bulk-btn group relative overflow-hidden"
            >
              {/* Shimmer sweep on hover */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/8 to-transparent transition-transform duration-500 group-hover:translate-x-full"
              />
              <Mail className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-px group-hover:scale-110" />
              <span>{t('apartments.generateInvites')}</span>
              {eligibleApartments.length > 0 && (
                <span
                  className="ml-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none"
                  style={{
                    background: 'hsl(var(--color-accent) / 0.15)',
                    border: '1px solid hsl(var(--color-accent) / 0.25)',
                    color: 'hsl(var(--color-accent))',
                  }}
                >
                  {eligibleApartments.length}
                </span>
              )}
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

      <Modal
        open={pendingBulkDelete}
        onClose={() => setPendingBulkDelete(false)}
        title={t('apartments.deleteSelectedTitle', { count: selectedIds.size })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingBulkDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmBulkDelete}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {t('apartments.deleteSelectedConfirm', { count: selectedIds.size })}
        </p>
      </Modal>

      {/* Bulk invite confirmation modal */}
      <Modal
        open={showInviteConfirm}
        onClose={() => { if (!isBulkSending) setShowInviteConfirm(false); }}
        title={t('apartments.generateInvitesTitle')}
        footer={
          <>
            <Button variant="ghost" disabled={isBulkSending} onClick={() => setShowInviteConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={eligibleApartments.length === 0}
              loading={isBulkSending}
              onClick={onBulkInviteConfirm}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {eligibleApartments.length > 0
                ? t('apartments.generateInvitesConfirm', { count: eligibleApartments.length })
                : t('apartments.generateInvitesTitle')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted">{t('apartments.generateInvitesBody')}</p>

          {eligibleApartments.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 py-6 text-center">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'hsl(var(--color-accent) / 0.1)' }}
              >
                <Mail className="h-5 w-5" style={{ color: 'hsl(var(--color-accent) / 0.5)' }} />
              </div>
              <p className="text-sm text-muted">{t('apartments.generateInvitesNone')}</p>
            </div>
          ) : (
            <>
              {/* Eligible count badge */}
              <div
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
                style={{
                  background: 'hsl(var(--color-accent) / 0.08)',
                  border: '1px solid hsl(var(--color-accent) / 0.2)',
                }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'hsl(var(--color-accent) / 0.15)' }}
                >
                  <Mail className="h-4 w-4" style={{ color: 'hsl(var(--color-accent))' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--color-accent))' }}>
                  {t('apartments.generateInvitesEligible', { count: eligibleApartments.length })}
                </p>
              </div>

              {/* Scrollable apartment list */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  {t('apartments.generateInvitesListTitle')}
                </p>
                <ul
                  className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface-2 p-2"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {eligibleApartments.map((apt) => {
                    const primaryEmail = apt.persons.find((p) => p.email && p.email.trim())?.email;
                    return (
                      <li
                        key={apt.id}
                        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface"
                      >
                        <span className="font-medium">
                          {apartmentShortLabel(apt)}
                          {apt.proprietar_principal_name && (
                            <span className="ml-1.5 font-normal text-muted">
                              &middot; {apt.proprietar_principal_name}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 truncate text-xs text-muted" title={primaryEmail ?? ''}>
                          {primaryEmail}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Quick-invite modal -- triggered by clicking the not-joined icon in the status column */}
      {inviteApt && (
        <Modal
          open
          onClose={() => setInviteApt(null)}
          title={t('apartments.sendInvite')}
          footer={
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => setInviteApt(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={onQuickInviteConfirm}>
                <Mail className="h-4 w-4" /> {t('apartments.sendByEmail')}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm">
              {t('apartments.inviteModalBody', { label: apartmentShortLabel(inviteApt) })}
            </p>

            {quickEmailPersons.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('apartments.inviteModalSelectEmail')}
                </p>
                <div className="space-y-1">
                  {quickEmailPersons.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--surface-raised)]"
                    >
                      <input
                        type="radio"
                        name="quick-invite-email"
                        value={p.email}
                        checked={quickSelectedEmail === p.email && !quickCustomEmail.trim()}
                        onChange={() => {
                          setQuickSelectedEmail(p.email);
                          setQuickCustomEmail('');
                        }}
                        className="accent-[var(--accent)]"
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-1 text-muted">
                          ({t(`apartments.role_${p.role}`)})
                        </span>
                      </span>
                      <span className="font-mono text-sm text-muted">{p.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                <span className="text-xs uppercase tracking-wide text-muted">
                  {t('apartments.inviteModalOrNew')}
                </span>
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              </div>
              <Input
                type="email"
                label={t('apartments.inviteModalNewEmailLabel')}
                placeholder={t('apartments.emailPlaceholder')}
                hint={t('apartments.inviteModalNewEmailHint')}
                value={quickCustomEmail}
                onChange={(e) => setQuickCustomEmail(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
