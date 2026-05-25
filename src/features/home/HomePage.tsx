import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Pencil,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  GripVertical,
  LayoutGrid,
} from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Icon } from '@/shared/components/Icon';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { useAuthStore } from '@/shared/store/authStore';
import { FEATURE_MAP, featureTitle, type FeatureDef } from '@/shared/features/registry';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { useMyIdentity } from '@/features/profile/profileStore';
import { useAsociatieAnnouncements } from '@/features/announcements/announcementsStore';
import { polls } from '@/features/polls/pollsStore';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import {
  type HomeCard,
  cycleCardSize,
  isDefaultLayout,
  moveCard,
  moveCardToInsertion,
  reconcileLayout,
  toggleCardVisible,
  visibleCards,
} from './homeLayoutLogic';
import { useHomeLayoutKey, useHomeLayoutStore } from './homeLayoutStore';
import { useHomeReorder } from './useHomeReorder';

/** A read-only feature shortcut card (view mode). */
function ShortcutCard({ feature, expanded }: { feature: FeatureDef; expanded: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/app/${feature.path}`}
      className={cn('transition-all duration-200', expanded && 'sm:col-span-2')}
    >
      <Card className="flex h-full flex-col items-center justify-center gap-2 py-5 text-center transition-colors hover:bg-surface-2">
        <Icon name={feature.icon} className="h-7 w-7 text-primary" />
        <span className="text-sm font-medium">{featureTitle(t, feature)}</span>
      </Card>
    </Link>
  );
}

/** An editable card with show/hide, reorder, size and drag controls (edit mode). */
function EditableCard({
  card,
  index,
  total,
  dragging,
  dropBefore,
  dropAfter,
  onToggle,
  onCycleSize,
  onMove,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  card: HomeCard;
  index: number;
  total: number;
  dragging: boolean;
  dropBefore: boolean;
  dropAfter: boolean;
  onToggle: () => void;
  onCycleSize: () => void;
  onMove: (delta: number) => void;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}) {
  const { t } = useTranslation();
  const feature = FEATURE_MAP[card.key];
  if (!feature) return null;

  return (
    <div
      data-card-index={index}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        'home-card-drag relative transition-all duration-200',
        card.size === 'expanded' && 'sm:col-span-2',
      )}
    >
      {dropBefore && (
        <span className="home-drop-caret home-drop-caret--before" aria-hidden="true" />
      )}
      {dropAfter && (
        <span className="home-drop-caret home-drop-caret--after" aria-hidden="true" />
      )}
      <Card
        className={cn(
          'flex h-full flex-col gap-2 py-3 transition-opacity duration-200',
          !card.visible && 'opacity-55',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="home-card-grip text-muted" aria-hidden="true">
            <GripVertical size={16} />
          </span>
          <Icon name={feature.icon} className="h-5 w-5 text-primary" />
          <span className="flex-1 truncate text-sm font-medium">{featureTitle(t, feature)}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="iconbtn"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              aria-label={t('home.moveUp')}
              title={t('home.moveUp')}
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              className="iconbtn"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              aria-label={t('home.moveDown')}
              title={t('home.moveDown')}
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              className="iconbtn"
              onClick={onCycleSize}
              aria-label={card.size === 'expanded' ? t('home.makeCompact') : t('home.makeExpanded')}
              title={card.size === 'expanded' ? t('home.makeCompact') : t('home.makeExpanded')}
            >
              {card.size === 'expanded' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
          <button
            type="button"
            className="iconbtn"
            onClick={onToggle}
            aria-label={card.visible ? t('home.hideCard') : t('home.showCard')}
            aria-pressed={card.visible}
            title={card.visible ? t('home.hideCard') : t('home.showCard')}
          >
            {card.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </Card>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const flags = useAsociatieFlags();
  const announcements = useAsociatieAnnouncements();
  const { userId } = useMyIdentity();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);

  const layoutKey = useHomeLayoutKey();
  const saved = useHomeLayoutStore((s) => s.forKey(layoutKey));
  const persist = useHomeLayoutStore((s) => s.save);
  const resetLayout = useHomeLayoutStore((s) => s.reset);

  const layout = useMemo(() => reconcileLayout(saved, flags), [saved, flags]);
  const [editing, setEditing] = useState(false);

  const canPersist = Boolean(asociatieId);
  const apply = (next: HomeCard[]) => {
    if (asociatieId) persist(userId, asociatieId, next);
  };

  // Pointer-driven reorder (mouse + touch + pen). The caret slot it reports is
  // resolved against the live card layout when a drop lands.
  const { draggingKey, dropIndex, gridRef, onItemPointerDown, onItemPointerMove, onItemPointerUp, onItemPointerCancel } =
    useHomeReorder((key, insertAt) => apply(moveCardToInsertion(layout, key, insertAt)));

  const fromIndex = draggingKey ? layout.findIndex((c) => c.key === draggingKey) : -1;
  // Hide the caret when a drop would not actually move the card (the slots on
  // either side of its current position), so the cue only ever promises change.
  const caretIsNoop =
    dropIndex === null || dropIndex === fromIndex || dropIndex === fromIndex + 1;

  const shown = visibleCards(layout);
  const atDefault = isDefaultLayout(layout, flags);

  return (
    <div>
      <PageHeader
        title={t('nav.home')}
        subtitle={DEMO_ASOCIATIE.name}
        action={
          layout.length > 0 && canPersist ? (
            editing ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => asociatieId && resetLayout(userId, asociatieId)}
                  disabled={atDefault}
                >
                  <RotateCcw size={15} /> {t('home.reset')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                  <Check size={15} /> {t('home.done')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                aria-label={t('home.customize')}
              >
                <Pencil size={15} /> {t('home.customize')}
              </Button>
            )
          ) : undefined
        }
      />

      {editing && (
        <p className="mb-3 text-sm text-muted">{t('home.editHint')}</p>
      )}

      {editing ? (
        <div ref={gridRef} className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {layout.map((card, i) => (
            <EditableCard
              key={card.key}
              card={card}
              index={i}
              total={layout.length}
              dragging={draggingKey === card.key}
              dropBefore={draggingKey !== null && !caretIsNoop && dropIndex === i}
              dropAfter={
                draggingKey !== null &&
                !caretIsNoop &&
                i === layout.length - 1 &&
                dropIndex === layout.length
              }
              onToggle={() => apply(toggleCardVisible(layout, card.key))}
              onCycleSize={() => apply(cycleCardSize(layout, card.key))}
              onMove={(delta) => apply(moveCard(layout, i, delta))}
              onPointerDown={(e) => onItemPointerDown(e, card.key)}
              onPointerMove={onItemPointerMove}
              onPointerUp={onItemPointerUp}
              onPointerCancel={onItemPointerCancel}
            />
          ))}
        </div>
      ) : shown.length > 0 ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((card) => {
            const feature = FEATURE_MAP[card.key];
            return feature ? (
              <ShortcutCard key={card.key} feature={feature} expanded={card.size === 'expanded'} />
            ) : null;
          })}
        </div>
      ) : layout.length > 0 ? (
        <Card className="mb-6">
          <EmptyState
            icon={<LayoutGrid size={22} />}
            title={t('home.allHiddenTitle')}
            body={t('home.allHiddenBody')}
          />
        </Card>
      ) : null}

      {!editing && flags['F09'] && polls.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">{t('polls.active')}</h2>
          <Card>
            <Link to="/app/voturi" className="font-medium text-primary hover:underline">
              {polls[0].title}
            </Link>
            <p className="text-sm text-muted">{polls[0].description}</p>
          </Card>
        </section>
      )}

      {!editing && flags['F01'] && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t('announcements.title')}</h2>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((a) => (
              <Card key={a.id}>
                <div className="flex items-center justify-between gap-2">
                  <Link to="/app/anunturi" className="font-medium hover:underline">
                    {a.title}
                  </Link>
                  <Badge tone="primary">{t(`announcements.category_${a.category}`)}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {a.published_at ? formatDateTime(a.published_at) : ''}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
