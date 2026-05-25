import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { useCurrentAsociatie } from './asociatieStore';
import { scariList } from './buildingLogic';

interface EntranceFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  className?: string;
  error?: string;
}

/**
 * The apartment "entrance" (scara) field. When the building has configured
 * entrances it is a dropdown of exactly those; otherwise it falls back to a free
 * text input so the admin is never blocked before configuring the building. An
 * out-of-list current value is preserved as a selectable option so editing an
 * older apartment never silently drops its entrance.
 */
export function EntranceField({
  value,
  onChange,
  label,
  ariaLabel,
  className,
  error,
}: EntranceFieldProps) {
  const { t } = useTranslation();
  const asociatie = useCurrentAsociatie();
  const entrances = scariList(asociatie?.settings);

  if (entrances.length === 0) {
    return (
      <Input
        label={label}
        aria-label={ariaLabel}
        className={className}
        value={value}
        error={error}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const options = value !== '' && !entrances.includes(value) ? [value, ...entrances] : entrances;
  return (
    <Select
      label={label}
      aria-label={ariaLabel}
      className={className}
      value={value}
      error={error}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{t('apartments.selectEntrance')}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  );
}
