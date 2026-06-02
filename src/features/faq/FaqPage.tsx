import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HelpCircle, ThumbsUp, ThumbsDown, Plus, Pencil, Archive } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { roleMatchesAudience } from '@/shared/features/featureRouteLogic';
import type { FaqEntry } from '@/shared/types/domain';
import { useFaqStore } from './faqStore';
import { searchFaq, visibleFaq, isSavableFaq, type FaqEntryInput } from './faqLogic';
import { hydrateFaq, createFaqEntry, updateFaqEntry, archiveFaqEntry } from './faqApi';

const EMPTY_INPUT: FaqEntryInput = { category: '', question: '', answer: '' };

export default function FaqPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId) ?? DEMO_ASOCIATIE.id;
  const role = useAuthStore((s) => s.activeRole)();
  const canManage = roleMatchesAudience(['admin', 'comitet'], role);

  const { items, myVotes, vote } = useFaqStore();
  const fetchError = useFaqStore((s) => s.fetchError);
  const [query, setQuery] = useState('');

  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FaqEntryInput>(EMPTY_INPUT);

  useEffect(() => {
    if (asociatieId) void hydrateFaq(asociatieId);
  }, [asociatieId]);

  const results = searchFaq(visibleFaq(items), query);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_INPUT);
    setOpen(true);
  };

  const openEdit = (e: FaqEntry) => {
    setEditing(e);
    setForm({ category: e.category, question: e.question, answer: e.answer });
    setOpen(true);
  };

  const save = () => {
    if (!isSavableFaq(form)) return;
    if (editing) {
      updateFaqEntry(editing.id, form);
      toast.success(t('faq.saved'));
    } else {
      createFaqEntry(asociatieId, form);
      toast.success(t('faq.created'));
    }
    setOpen(false);
    setForm(EMPTY_INPUT);
    setEditing(null);
  };

  const archive = (e: FaqEntry) => {
    archiveFaqEntry(e.id);
    toast.success(t('faq.archived'));
  };

  return (
    <div>
      <PageHeader
        title={t('faq.title')}
        subtitle={t('faq.subtitle')}
        action={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('faq.add')}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <Input
          aria-label={t('common.search')}
          placeholder={t('faq.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {fetchError ? (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                if (asociatieId) void hydrateFaq(asociatieId);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState body={t('faq.empty')} icon={<HelpCircle className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((e) => {
            const voted = myVotes[e.id];
            return (
              <Card key={e.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{e.question}</h2>
                  <Badge tone="primary">{e.category}</Badge>
                </div>
                <p className="mb-3 whitespace-pre-line text-text">{e.answer}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span>{t('faq.wasHelpful')}</span>
                  <Button
                    variant={voted === true ? 'primary' : 'secondary'}
                    size="sm"
                    disabled={voted !== undefined}
                    onClick={() => vote(e.id, true)}
                    aria-label={t('faq.helpful')}
                  >
                    <ThumbsUp className="h-4 w-4" /> {e.helpful_count}
                  </Button>
                  <Button
                    variant={voted === false ? 'danger' : 'secondary'}
                    size="sm"
                    disabled={voted !== undefined}
                    onClick={() => vote(e.id, false)}
                    aria-label={t('faq.notHelpful')}
                  >
                    <ThumbsDown className="h-4 w-4" /> {e.not_helpful_count}
                  </Button>
                  {canManage && (
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)} aria-label={t('faq.edit')}>
                        <Pencil className="h-4 w-4" /> {t('faq.edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => archive(e)} aria-label={t('faq.archive')}>
                        <Archive className="h-4 w-4" /> {t('faq.archive')}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {canManage && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={editing ? t('faq.edit') : t('faq.add')}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={save} disabled={!isSavableFaq(form)}>
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label={t('faq.category')}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <Input
              label={t('faq.question')}
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            />
            <Textarea
              label={t('faq.answer')}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
