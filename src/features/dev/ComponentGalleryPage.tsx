import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { Switch } from '@/shared/components/Switch';
import { Checkbox } from '@/shared/components/Checkbox';
import { PageHeader } from '@/shared/components/PageHeader';
import { useThemeStore } from '@/shared/store/themeStore';
import { useTintStore, type Tint } from '@/shared/store/tintStore';

const PALETTES: Array<{ tint: Tint; label: string; hex: string }> = [
  { tint: 'sage',       label: 'Sage',       hex: '#6b8f71' },
  { tint: 'terracotta', label: 'Terracotta',  hex: '#c17a52' },
  { tint: 'ocean',      label: 'Ocean',       hex: '#4a78b0' },
  { tint: 'indigo',     label: 'Indigo',      hex: '#6b5bb5' },
  { tint: 'plum',       label: 'Plum',        hex: '#9c4a7a' },
];

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
const BUTTON_SIZES    = ['sm', 'md', 'lg'] as const;
const BADGE_TONES     = ['neutral', 'primary', 'success', 'warning', 'danger'] as const;

function GSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card__header">
        <h3 style={{
          margin: 0,
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
        }}>
          {title}
        </h3>
      </div>
      <div className="card__body">{children}</div>
    </div>
  );
}

function GRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', minWidth: 90 }}>{label}</span>
      {children}
    </div>
  );
}

export default function ComponentGalleryPage() {
  const { t } = useTranslation();
  const { theme, toggle } = useThemeStore();
  const { tint, setTint } = useTintStore();
  const [modalOpen,       setModalOpen]       = useState(false);
  const [switchChecked,   setSwitchChecked]   = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);

  return (
    <>
      <PageHeader
        title={t('gallery.title')}
        subtitle={t('gallery.subtitle')}
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn--secondary btn--sm"
              onClick={toggle}
              aria-label={theme === 'dark' ? t('gallery.switchLight') : t('gallery.switchDark')}
              title={theme === 'dark' ? t('gallery.switchLight') : t('gallery.switchDark')}
            >
              {theme === 'dark' ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
            </button>
            <div
              role="group"
              aria-label={t('gallery.palette')}
              style={{ display: 'flex', gap: 5 }}
            >
              {PALETTES.map((p) => (
                <button
                  key={p.tint}
                  onClick={() => setTint(p.tint)}
                  aria-label={p.label}
                  aria-pressed={tint === p.tint}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: p.hex,
                    border: tint === p.tint
                      ? '2px solid var(--text-primary)'
                      : '2px solid transparent',
                    outline: tint === p.tint ? '2px solid var(--primary)' : 'none',
                    outlineOffset: 1,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'outline 120ms ease, border-color 120ms ease',
                  }}
                />
              ))}
            </div>
          </div>
        }
      />

      <GSection title={t('gallery.buttons')}>
        {BUTTON_VARIANTS.map((variant) => (
          <GRow key={variant} label={variant}>
            {BUTTON_SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>{size}</Button>
            ))}
            <Button variant={variant} loading>{t('gallery.loading')}</Button>
            <Button variant={variant} disabled>{t('gallery.disabled')}</Button>
          </GRow>
        ))}
      </GSection>

      <GSection title={t('gallery.badges')}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>{tone}</Badge>
          ))}
        </div>
      </GSection>

      <GSection title={t('gallery.inputs')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <Input label={t('gallery.fieldLabel')} placeholder={t('gallery.placeholder')} />
          <Input label={t('gallery.fieldLabel')} hint={t('gallery.sampleHint')} placeholder={t('gallery.placeholder')} />
          <Input label={t('gallery.fieldLabel')} error={t('gallery.sampleError')} placeholder={t('gallery.placeholder')} />
          <Input label={t('gallery.fieldLabel')} suffix="lei" placeholder="0" type="number" />
          <Input label={t('gallery.fieldLabel')} disabled placeholder={t('gallery.placeholder')} />
        </div>
      </GSection>

      <GSection title={t('gallery.select')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <Select label={t('gallery.fieldLabel')}>
            <option>{t('gallery.option1')}</option>
            <option>{t('gallery.option2')}</option>
          </Select>
          <Select label={t('gallery.fieldLabel')} error={t('gallery.sampleError')}>
            <option>{t('gallery.option1')}</option>
          </Select>
          <Select label={t('gallery.fieldLabel')} disabled>
            <option>{t('gallery.option1')}</option>
          </Select>
        </div>
      </GSection>

      <GSection title={t('gallery.textarea')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <Textarea label={t('gallery.fieldLabel')} rows={3} placeholder={t('gallery.placeholder')} />
          <Textarea label={t('gallery.fieldLabel')} error={t('gallery.sampleError')} rows={3} />
          <Textarea label={t('gallery.fieldLabel')} disabled rows={3} placeholder={t('gallery.placeholder')} />
        </div>
      </GSection>

      <GSection title={t('gallery.switches')}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <Switch
            checked={switchChecked}
            onChange={setSwitchChecked}
            label={t('gallery.switchOn')}
          />
          <Switch
            checked={false}
            onChange={() => {}}
            label={t('gallery.switchOff')}
          />
          <Switch
            checked
            onChange={() => {}}
            label={t('gallery.disabled')}
            disabled
          />
          <Checkbox
            checked={checkboxChecked}
            onChange={setCheckboxChecked}
            label={t('gallery.checkboxOn')}
          />
          <Checkbox
            checked={false}
            onChange={() => {}}
            label={t('gallery.checkboxOff')}
          />
          <Checkbox
            checked={false}
            onChange={() => {}}
            label={t('gallery.disabled')}
            disabled
          />
        </div>
      </GSection>

      <GSection title={t('gallery.cards')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          <Card>{t('gallery.cardNoTitle')}</Card>
          <Card title={t('gallery.cardWithTitle')}>{t('gallery.cardBody')}</Card>
          <Card
            title={t('gallery.cardWithFooter')}
            footer={<Button size="sm" variant="secondary">{t('gallery.action')}</Button>}
          >
            {t('gallery.cardBody')}
          </Card>
        </div>
      </GSection>

      <GSection title={t('gallery.modals')}>
        <Button onClick={() => setModalOpen(true)}>{t('gallery.openModal')}</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={t('gallery.modalTitle')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                {t('common.confirm')}
              </Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{t('gallery.modalBody')}</p>
        </Modal>
      </GSection>
    </>
  );
}
