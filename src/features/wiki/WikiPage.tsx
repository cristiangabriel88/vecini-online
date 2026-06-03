import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Search, Pencil } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useWikiStore, useAsociatieWiki } from './wikiStore';
import { hydrateWiki, addWikiPageLive, updateWikiPageLive } from './wikiApi';
import { isValidPage, searchPages, sortPages, slugify, canManageWiki } from './wikiLogic';

export default function WikiPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const role = useAuthStore((s) => s.activeRole)();
  const fetchError = useWikiStore((s) => s.fetchError);
  const pages = useAsociatieWiki();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateWiki(asociatieId);
  }, [asociatieId]);

  const results = useMemo(() => sortPages(searchPages(pages, query)), [pages, query]);
  const valid = isValidPage(title, body);
  const editing = editId !== null || creating;
  const canManage = canManageWiki(role);

  const startCreate = () => {
    setCreating(true);
    setTitle('');
    setBody('');
  };

  const startEdit = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setEditId(id);
    setTitle(page.title);
    setBody(page.body_md);
  };

  const closeEditor = () => {
    setCreating(false);
    setEditId(null);
  };

  const submit = () => {
    if (!valid || !asociatieId) return;
    if (editId) {
      updateWikiPageLive(asociatieId, editId, title, body);
      toast.success(t('wiki.updated'));
    } else {
      const newPage = {
        id: `wk-${Date.now()}`,
        asociatie_id: asociatieId,
        slug: slugify(title),
        title: title.trim(),
        body_md: body.trim(),
        updated_at: new Date().toISOString(),
      };
      addWikiPageLive(asociatieId, newPage);
      toast.success(t('wiki.added'));
    }
    closeEditor();
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateWiki(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('wiki.title')}
        subtitle={t('wiki.subtitle')}
        action={
          canManage ? (
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4" /> {t('wiki.new')}
            </Button>
          ) : undefined
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          placeholder={t('wiki.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('common.search')}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('wiki.empty')} icon={<BookOpen className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((p) => {
            const expanded = openId === p.id;
            return (
              <Card key={p.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="text-left font-medium hover:text-primary"
                    onClick={() => setOpenId(expanded ? null : p.id)}
                    aria-expanded={expanded}
                  >
                    {p.title}
                  </button>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(p.id)}>
                      <Pencil className="h-4 w-4" /> {t('common.edit')}
                    </Button>
                  )}
                </div>
                {expanded && (
                  <>
                    <p className="whitespace-pre-line text-sm">{p.body_md}</p>
                    <p className="text-sm text-muted">
                      {t('wiki.updatedOn', { date: formatDate(p.updated_at) })}
                    </p>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={editing}
        onClose={closeEditor}
        title={editId ? t('wiki.editTitle') : t('wiki.new')}
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('wiki.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label={t('wiki.body')}
            placeholder={t('wiki.bodyHint')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[160px]"
          />
        </div>
      </Modal>
    </div>
  );
}
