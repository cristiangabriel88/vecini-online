import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Gavel, Plus, ChevronDown, FileDown, MapPin, Video, UserCheck, Paperclip } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Switch } from '@/shared/components/Switch';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { readFileAsDataUrl, validateFile, formatFileSize } from '@/shared/lib/file';
import type { AgaDecision, AgaMeeting, MajorityRule } from '@/shared/types/domain';
import { recordAudit } from '@/shared/store/auditStore';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { findVoterApartmentId, quorumApartmentCount } from '@/features/polls/pollLogic';
import { useAgaStore, useAsociatieAgas } from './agaStore';
import {
  addAgendaItem as apiAddAgendaItem,
  advanceStatus as apiAdvanceStatus,
  castProxyVote as apiCastProxyVote,
  castVote as apiCastVote,
  convokeMeeting,
  hydrateAgas,
  recordProxy,
  setRsvp as apiSetRsvp,
} from './agaApi';
import {
  generateProcesVerbal,
  isQuorumMet,
  isValidAgendaItem,
  isValidMeeting,
  isValidProxy,
  itemOutcome,
  itemPercentages,
  itemTally,
  nextStatus,
  presentApartments,
  quorumPercent,
  sortMeetings,
} from './agaLogic';

const DECISIONS: AgaDecision[] = ['pentru', 'contra', 'abtinere'];
const RULES: MajorityRule[] = ['simple', 'absolute', 'qualified_2_3'];

// Procură documents: PDF or image, capped so an offline data URL stays small.
const PROXY_DOC_MAX_BYTES = 5 * 1024 * 1024;
const PROXY_DOC_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

const statusTone = (s: AgaMeeting['status']) =>
  s === 'in_desfasurare' ? 'success' : s === 'convocata' ? 'primary' : 'neutral';

function downloadProcesVerbal(meeting: AgaMeeting) {
  const blob = new Blob([generateProcesVerbal(meeting)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proces-verbal-${meeting.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AgaPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const voterUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const meetings = useAsociatieAgas();
  const fetchError = useAgaStore((s) => s.fetchError);
  const apartments = useAsociatieApartments();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create-meeting modal state.
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [location, setLocation] = useState('');
  const [online, setOnline] = useState(false);

  // Add-agenda-item modal state.
  const [agendaFor, setAgendaFor] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemRule, setItemRule] = useState<MajorityRule>('simple');

  // Add-proxy (procură) modal state.
  const [proxyFor, setProxyFor] = useState<string | null>(null);
  const [grantorApt, setGrantorApt] = useState('');
  const [proxyHolder, setProxyHolder] = useState('');
  const [docName, setDocName] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asociatieId) void hydrateAgas(asociatieId, voterUserId);
  }, [asociatieId, voterUserId]);

  const ordered = sortMeetings(meetings);
  const meetingValid = isValidMeeting(title, when);
  const itemValid = isValidAgendaItem(itemTitle);
  const proxyValid = isValidProxy(grantorApt, proxyHolder);
  const apartmentId = findVoterApartmentId(apartments, voterUserId);

  const submitMeeting = () => {
    if (!meetingValid) return;
    convokeMeeting(asociatieId ?? '', title, when, location, online, quorumApartmentCount(apartments));
    recordAudit({ action: 'aga.scheduled', entity: 'aga', entity_label: title.trim() });
    toast.success(t('aga.meetingAdded'));
    setOpen(false);
    setTitle('');
    setWhen('');
    setLocation('');
    setOnline(false);
  };

  const submitAgenda = () => {
    if (!agendaFor || !itemValid) return;
    apiAddAgendaItem(asociatieId ?? '', agendaFor, itemTitle, itemDesc, itemRule);
    toast.success(t('aga.itemAdded'));
    setAgendaFor(null);
    setItemTitle('');
    setItemDesc('');
    setItemRule('simple');
  };

  const resetProxyForm = () => {
    setProxyFor(null);
    setGrantorApt('');
    setProxyHolder('');
    setDocName(null);
    setDocUrl(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const onPickDoc = async (file: File | undefined) => {
    if (!file) return;
    const err = validateFile(file, PROXY_DOC_MAX_BYTES, PROXY_DOC_TYPES);
    if (err) {
      toast.error(t(err === 'too_large' ? 'aga.docTooLarge' : 'aga.docBadType'));
      return;
    }
    setDocName(`${file.name} (${formatFileSize(file.size)})`);
    setDocUrl(await readFileAsDataUrl(file));
  };

  const submitProxy = () => {
    if (!proxyFor || !proxyValid) return;
    recordProxy(asociatieId ?? '', proxyFor, {
      id: `agp-${Date.now()}`,
      grantor_apartment: grantorApt.trim(),
      proxy_holder: proxyHolder.trim(),
      document_name: docName,
      document_url: docUrl,
      votes: {},
    });
    toast.success(t('aga.proxyAdded'));
    resetProxyForm();
  };

  if (fetchError) {
    return (
      <div>
        <PageHeader title={t('aga.title')} subtitle={t('aga.subtitle')} />
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                if (asociatieId) void hydrateAgas(asociatieId, voterUserId);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('aga.title')}
        subtitle={t('aga.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('aga.new')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('aga.empty')} icon={<Gavel className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((m) => {
            const quorum = quorumPercent(m);
            const met = isQuorumMet(m);
            const isOpen = expanded === m.id;
            const next = nextStatus(m.status);
            return (
              <Card key={m.id} className="p-4">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  aria-expanded={isOpen}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(m.status)}>{t(`aga.status.${m.status}`)}</Badge>
                      <p className="font-medium">{m.title}</p>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      {m.scheduled_online ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {formatDateTime(m.scheduled_at)}
                      {' · '}
                      {m.scheduled_online ? t('aga.online') : m.location || t('aga.noLocation')}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {t('aga.quorum', {
                        present: presentApartments(m),
                        total: m.total_apartments,
                        percent: quorum,
                      })}
                    </span>
                    <Badge tone={met ? 'success' : 'warning'}>
                      {met ? t('aga.quorumMet') : t('aga.quorumNotMet', { percent: m.required_quorum_percent })}
                    </Badge>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={met ? 'h-full bg-success' : 'h-full bg-warning'}
                      style={{ width: `${Math.min(quorum, 100)}%` }}
                    />
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    {m.status !== 'incheiata' && (
                      <div>
                        <p className="mb-2 text-sm font-medium">{t('aga.attendance')}</p>
                        <div className="flex flex-wrap gap-2">
                          {(['prezent', 'procura', 'absent'] as const).map((r) => (
                            <Button
                              key={r}
                              size="sm"
                              variant={m.my_rsvp === r ? 'primary' : 'secondary'}
                              onClick={() => apiSetRsvp(asociatieId ?? '', m.id, r, voterUserId, apartmentId)}
                            >
                              {t(`aga.rsvp.${r}`)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{t('aga.proxies')}</p>
                        {m.status !== 'incheiata' && (
                          <Button size="sm" variant="ghost" onClick={() => setProxyFor(m.id)}>
                            <UserCheck className="h-4 w-4" /> {t('aga.addProxy')}
                          </Button>
                        )}
                      </div>
                      {m.proxies.length === 0 ? (
                        <p className="text-sm text-muted">{t('aga.proxiesEmpty')}</p>
                      ) : (
                        <ul className="space-y-1">
                          {m.proxies.map((p) => (
                            <li
                              key={p.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <UserCheck className="h-4 w-4 text-primary" />
                              <span className="font-medium">{p.grantor_apartment}</span>
                              <span className="text-muted">{t('aga.proxyHeldBy', { holder: p.proxy_holder })}</span>
                              {p.document_name &&
                                (p.document_url ? (
                                  <a
                                    href={p.document_url}
                                    download={p.document_name}
                                    className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Paperclip className="h-4 w-4" /> {t('aga.viewDoc')}
                                  </a>
                                ) : (
                                  <Badge tone="neutral">
                                    <Paperclip className="mr-1 inline h-3 w-3" />
                                    {t('aga.docAttached')}
                                  </Badge>
                                ))}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium">{t('aga.agenda')}</p>
                      {m.agenda.length === 0 ? (
                        <p className="text-sm text-muted">{t('aga.agendaEmpty')}</p>
                      ) : (
                        [...m.agenda]
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((item, i) => {
                            const tally = itemTally(item, m.proxies);
                            const pct = itemPercentages(item, m.proxies);
                            const outcome = itemOutcome(item, m);
                            return (
                              <div key={item.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium">
                                    {i + 1}. {item.title}
                                  </p>
                                  {tally.total > 0 && (
                                    <Badge
                                      tone={
                                        outcome === 'adoptat'
                                          ? 'success'
                                          : outcome === 'respins'
                                            ? 'danger'
                                            : 'neutral'
                                      }
                                    >
                                      {t(`aga.outcome.${outcome}`)}
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                                )}
                                <p className="mt-1 text-xs text-muted">{t(`aga.rule.${item.majority_rule}`)}</p>

                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                                  <div className="h-full bg-success" style={{ width: `${pct.pentru}%` }} />
                                </div>
                                <p className="mt-1 text-sm text-muted">
                                  {t('aga.tally', {
                                    pentru: tally.pentru,
                                    contra: tally.contra,
                                    abtinere: tally.abtinere,
                                  })}
                                </p>

                                {m.status === 'in_desfasurare' && (
                                  <>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {DECISIONS.map((d) => (
                                        <Button
                                          key={d}
                                          size="sm"
                                          variant={item.my_vote === d ? 'primary' : 'secondary'}
                                          onClick={() =>
                                            apiCastVote(asociatieId ?? '', m.id, item.id, d, apartmentId)
                                          }
                                        >
                                          {t(`aga.decision.${d}`)}
                                        </Button>
                                      ))}
                                    </div>
                                    {m.proxies.map((p) => (
                                      <div key={p.id} className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-muted">
                                          {t('aga.proxyVoteFor', { apartment: p.grantor_apartment })}
                                        </span>
                                        {DECISIONS.map((d) => (
                                          <Button
                                            key={d}
                                            size="sm"
                                            variant={p.votes[item.id] === d ? 'primary' : 'ghost'}
                                            onClick={() =>
                                              apiCastProxyVote(
                                                asociatieId ?? '',
                                                m.id,
                                                p.id,
                                                item.id,
                                                d,
                                                apartmentId,
                                              )
                                            }
                                          >
                                            {t(`aga.decision.${d}`)}
                                          </Button>
                                        ))}
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            );
                          })
                      )}
                      {m.status === 'convocata' && (
                        <Button size="sm" variant="ghost" onClick={() => setAgendaFor(m.id)}>
                          <Plus className="h-4 w-4" /> {t('aga.addItem')}
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {next && (
                        <Button
                          size="sm"
                          onClick={() => {
                            apiAdvanceStatus(asociatieId ?? '', m.id);
                            recordAudit({
                              action: next === 'in_desfasurare' ? 'aga.opened' : 'aga.closed',
                              entity: 'aga',
                              entity_label: m.title,
                            });
                          }}
                        >
                          {next === 'in_desfasurare' ? t('aga.openMeeting') : t('aga.closeMeeting')}
                        </Button>
                      )}
                      {m.status === 'incheiata' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            downloadProcesVerbal(m);
                            toast.success(t('aga.pvDownloaded'));
                          }}
                        >
                          <FileDown className="h-4 w-4" /> {t('aga.downloadPv')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('aga.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitMeeting} disabled={!meetingValid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('aga.meetingTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label={t('aga.date')}
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
          <Input
            label={t('aga.location')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={online}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('aga.onlineMeeting')}</span>
            <Switch checked={online} onChange={setOnline} label={t('aga.onlineMeeting')} />
          </div>
        </div>
      </Modal>

      <Modal
        open={agendaFor !== null}
        onClose={() => setAgendaFor(null)}
        title={t('aga.addItem')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAgendaFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitAgenda} disabled={!itemValid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('aga.itemTitle')} value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
          <Input label={t('aga.itemDesc')} value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />
          <Select
            label={t('aga.majorityRule')}
            value={itemRule}
            onChange={(e) => setItemRule(e.target.value as MajorityRule)}
          >
            {RULES.map((r) => (
              <option key={r} value={r}>
                {t(`aga.rule.${r}`)}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={proxyFor !== null}
        onClose={resetProxyForm}
        title={t('aga.addProxy')}
        footer={
          <>
            <Button variant="ghost" onClick={resetProxyForm}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitProxy} disabled={!proxyValid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('aga.proxyHint')}</p>
          <Input
            label={t('aga.proxyApartment')}
            value={grantorApt}
            onChange={(e) => setGrantorApt(e.target.value)}
          />
          <Input
            label={t('aga.proxyHolder')}
            value={proxyHolder}
            onChange={(e) => setProxyHolder(e.target.value)}
          />
          <div>
            <span className="mb-1 block text-sm font-medium">{t('aga.proxyDoc')}</span>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,image/png,image/jpeg"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm"
              onChange={(e) => void onPickDoc(e.target.files?.[0])}
            />
            {docName && <p className="mt-1 text-sm text-muted">{docName}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
