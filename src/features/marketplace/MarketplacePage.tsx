import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ShoppingBag, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatLei, formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { canPostNow, charsRemaining, isOverLength, LISTING_RATE_LIMIT } from '@/shared/lib/contentGuard';
import { useMarketplaceStore, useAsociatieMarketplace } from './marketplaceStore';
import { hydrateListings, addListingLive } from './marketplaceApi';
import {
  activeListings,
  isValidListing,
  isValidListingDesc,
  MARKETPLACE_CATEGORIES,
  LISTING_TITLE_MAX,
  LISTING_DESC_MAX,
  expiryFrom,
} from './marketplaceLogic';

function MarketplaceComposeModal({
  open,
  onClose,
  asociatieId,
}: {
  open: boolean;
  onClose: () => void;
  asociatieId: string;
}) {
  const { t } = useTranslation();
  const { userId } = useMyIdentity();
  const profileGet = useProfileStore((s) => s.get);
  const postTimestamps = useMarketplaceStore((s) => s.postTimestamps);
  const recordPost = useMarketplaceStore((s) => s.recordPost);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newCategory, setNewCategory] = useState<string>(MARKETPLACE_CATEGORIES[0]);
  const [price, setPrice] = useState('');

  const titleOver = isOverLength(title, LISTING_TITLE_MAX);
  const descOver = isOverLength(description, LISTING_DESC_MAX);
  const titleLeft = charsRemaining(title, LISTING_TITLE_MAX);
  const descLeft = charsRemaining(description, LISTING_DESC_MAX);

  const valid = isValidListing(title) && isValidListingDesc(description);

  const submit = () => {
    if (!valid) return;
    const uid = userId ?? 'u-res';
    if (!canPostNow(postTimestamps[`${asociatieId}:${uid}`] ?? [], LISTING_RATE_LIMIT)) {
      toast.error(t('contentGuard.rateLimited', { limit: LISTING_RATE_LIMIT }));
      return;
    }
    const profile = profileGet(uid, '');
    const sellerName = profile.fullName || profile.displayName || 'Rezident';
    const parsed = price.trim() === '' ? null : Math.max(0, Number(price.replace(',', '.')) || 0);
    const now = new Date().toISOString();
    const item = {
      id: `ml-${Date.now()}`,
      asociatie_id: asociatieId,
      seller_user_id: uid,
      seller_name: sellerName,
      category: newCategory,
      title: title.trim(),
      description: description.trim(),
      price: parsed,
      photo_path: null,
      expires_at: expiryFrom(now),
      created_at: now,
    };
    addListingLive(asociatieId, item);
    recordPost(asociatieId, uid);
    toast.success(t('marketplace.added'));
    setTitle('');
    setDescription('');
    setPrice('');
    setNewCategory(MARKETPLACE_CATEGORIES[0]);
    onClose();
  };

  const titleHint = titleLeft <= 20 ? t('contentGuard.charsLeft', { count: Math.max(0, titleLeft) }) : undefined;
  const descHint = descLeft <= 100 ? t('contentGuard.charsLeft', { count: Math.max(0, descLeft) }) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('marketplace.new')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid}>
            {t('common.publish')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label={t('marketplace.titleLabel')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={LISTING_TITLE_MAX + 10}
          error={titleOver ? t('contentGuard.tooLong', { max: LISTING_TITLE_MAX }) : undefined}
          hint={!titleOver ? titleHint : undefined}
        />
        <Textarea
          label={t('marketplace.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={LISTING_DESC_MAX + 10}
          error={descOver ? t('contentGuard.tooLong', { max: LISTING_DESC_MAX }) : undefined}
          hint={!descOver ? descHint : undefined}
        />
        <Select
          label={t('marketplace.category')}
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        >
          {MARKETPLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Input
          label={t('marketplace.priceLabel')}
          hint={t('marketplace.priceHint')}
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
    </Modal>
  );
}

export default function MarketplacePage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useMarketplaceStore((s) => s.fetchError);
  const listings = useAsociatieMarketplace();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (asociatieId) void hydrateListings(asociatieId);
  }, [asociatieId]);

  const results = activeListings(listings, query, category);

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateListings(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('marketplace.title')}
        subtitle={t('marketplace.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('marketplace.new')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label={t('common.search')}
          placeholder={t('marketplace.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select aria-label={t('marketplace.category')} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{t('common.all')}</option>
          {MARKETPLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('marketplace.empty')} icon={<ShoppingBag className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((l) => (
            <Card key={l.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{l.title}</p>
                <Badge tone={l.price ? 'primary' : 'success'}>
                  {l.price ? formatLei(l.price) : t('marketplace.free')}
                </Badge>
              </div>
              {l.description && <p className="text-sm text-text">{l.description}</p>}
              <p className="text-sm text-muted">
                {l.seller_name} · {l.category} · {t('marketplace.until', { date: formatDate(l.expires_at) })}
              </p>
            </Card>
          ))}
        </div>
      )}

      <MarketplaceComposeModal
        open={open}
        onClose={() => setOpen(false)}
        asociatieId={asociatieId ?? ''}
      />
    </div>
  );
}
