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
import { useMarketplaceStore, useAsociatieMarketplace } from './marketplaceStore';
import { hydrateListings, addListingLive } from './marketplaceApi';
import { activeListings, isValidListing, MARKETPLACE_CATEGORIES, expiryFrom } from './marketplaceLogic';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newCategory, setNewCategory] = useState<string>(MARKETPLACE_CATEGORIES[0]);
  const [price, setPrice] = useState('');

  const valid = isValidListing(title);

  const submit = () => {
    if (!valid) return;
    const profile = profileGet(userId ?? '', '');
    const sellerName = profile.fullName || profile.displayName || 'Rezident';
    const parsed = price.trim() === '' ? null : Math.max(0, Number(price.replace(',', '.')) || 0);
    const now = new Date().toISOString();
    const item = {
      id: `ml-${Date.now()}`,
      asociatie_id: asociatieId,
      seller_user_id: userId ?? 'u-res',
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
    toast.success(t('marketplace.added'));
    setTitle('');
    setDescription('');
    setPrice('');
    setNewCategory(MARKETPLACE_CATEGORIES[0]);
    onClose();
  };

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
        <Input label={t('marketplace.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          label={t('marketplace.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
