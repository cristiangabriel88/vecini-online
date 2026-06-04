import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Inbox, Send } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDateTime } from '@/shared/lib/format';
import type { SupportMessage, SupportThread } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_PLATFORM_ADMIN } from './demoPlatform';
import { usePlatformMessengerStore } from './platformMessengerStore';
import { awaitingReply, isValidMessage, sortThreads, unreadFor } from '@/features/support/supportLogic';

/**
 * T99 -- Platform superadmin messenger inbox. Shows all support threads across
 * all asociatii, lets the operator reply and toggle resolution status.
 */
export default function PlatformMessengerPage() {
  const { t } = useTranslation();

  const liveProfile = useAuthStore((s) => s.profile);
  const operatorName = liveProfile?.full_name ?? DEMO_PLATFORM_ADMIN.name;

  const allThreadsMap = usePlatformMessengerStore((s) => s.byAsociatie);
  const replyAction = usePlatformMessengerStore((s) => s.reply);
  const markReadAction = usePlatformMessengerStore((s) => s.markRead);
  const toggleStatusAction = usePlatformMessengerStore((s) => s.toggleStatus);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [filterAsoc, setFilterAsoc] = useState('');

  const allFlat = useMemo(
    () => Object.values(allThreadsMap).flat() as SupportThread[],
    [allThreadsMap],
  );

  const filtered = useMemo(() => {
    const q = filterAsoc.toLowerCase().trim();
    const base = q
      ? allFlat.filter((t) => t.asociatie_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
      : allFlat;
    return sortThreads(base);
  }, [allFlat, filterAsoc]);

  const selected = selectedId ? allFlat.find((t) => t.id === selectedId) ?? null : null;

  const open = (thread: SupportThread) => {
    setSelectedId(thread.id);
    setReplyBody('');
    markReadAction(thread.asociatie_id, thread.id, 'superadmin');
  };

  const back = () => {
    setSelectedId(null);
    setReplyBody('');
  };

  const send = () => {
    if (!selected || !isValidMessage(replyBody)) return;
    replyAction(selected.asociatie_id, selected.id, operatorName, replyBody);
    setReplyBody('');
  };

  const toggle = () => {
    if (!selected) return;
    toggleStatusAction(selected.asociatie_id, selected.id);
  };

  return (
    <div>
      <PageHeader
        title={t('platform.messenger.title')}
        subtitle={t('platform.messenger.subtitle')}
      />

      {selected ? (
        <ThreadView
          thread={selected}
          operatorName={operatorName}
          replyBody={replyBody}
          onReplyChange={setReplyBody}
          onSend={send}
          onToggle={toggle}
          onBack={back}
        />
      ) : (
        <>
          <div className="mb-4">
            <Input
              placeholder={t('platform.messenger.filterPlaceholder')}
              value={filterAsoc}
              onChange={(e) => setFilterAsoc(e.target.value)}
              aria-label={t('platform.messenger.filterPlaceholder')}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              body={t('platform.messenger.empty')}
              icon={<Inbox className="h-10 w-10" />}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((th) => {
                const unread = unreadFor(th, 'superadmin');
                const needsReply = awaitingReply(th, 'admin');
                return (
                  <Card key={th.id} className="p-0">
                    <button
                      className="flex w-full items-start justify-between gap-3 p-4 text-left"
                      onClick={() => open(th)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted">{th.asociatie_name}</p>
                        <p className="truncate font-medium">{th.subject}</p>
                        <p className="text-sm text-muted">
                          {t('platform.messenger.messageCount', { count: th.messages.length })}
                          {needsReply && ` · ${t('platform.messenger.awaitingReply')}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {unread > 0 && <Badge tone="primary">{unread}</Badge>}
                        <Badge tone={th.status === 'open' ? 'warning' : 'success'}>
                          {t(`platform.messenger.status_${th.status}`)}
                        </Badge>
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ThreadViewProps {
  thread: SupportThread;
  operatorName: string;
  replyBody: string;
  onReplyChange: (v: string) => void;
  onSend: () => void;
  onToggle: () => void;
  onBack: () => void;
}

function ThreadView({
  thread,
  operatorName,
  replyBody,
  onReplyChange,
  onSend,
  onToggle,
  onBack,
}: ThreadViewProps) {
  const { t } = useTranslation();
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <button className="flex items-center gap-2 text-sm text-muted" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('platform.messenger.backToInbox')}
        </button>
        <Badge tone={thread.status === 'open' ? 'warning' : 'success'}>
          {t(`platform.messenger.status_${thread.status}`)}
        </Badge>
      </div>

      <div>
        <p className="text-xs text-muted">{thread.asociatie_name}</p>
        <p className="font-medium">{thread.subject}</p>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        {thread.messages.map((m: SupportMessage) => {
          const mine = m.sender === 'superadmin';
          return (
            <div
              key={m.id}
              className={mine ? 'ml-8 rounded-lg bg-primary/10 p-2' : 'mr-8 rounded-lg bg-surface-2 p-2'}
            >
              <p className="text-xs text-muted">
                {mine ? operatorName : m.sender_name} · {formatDateTime(m.created_at)}
              </p>
              <p className="whitespace-pre-line text-sm">{m.body}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={replyBody}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder={t('platform.messenger.replyPlaceholder')}
          aria-label={t('platform.messenger.replyPlaceholder')}
        />
        <Button onClick={onSend} disabled={!isValidMessage(replyBody)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <Button size="sm" variant="ghost" onClick={onToggle}>
        {thread.status === 'open'
          ? t('platform.messenger.markResolved')
          : t('platform.messenger.reopen')}
      </Button>
    </Card>
  );
}
