import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatLei } from '@/shared/lib/format';
import { generateInviteCode } from '@/shared/lib/inviteCode';
import { DEMO_APARTMENTS } from '@/shared/demo/demoData';

export default function ApartmentsPage() {
  const { t } = useTranslation();
  const apartments = DEMO_APARTMENTS;

  return (
    <div>
      <PageHeader
        title={t('apartments.title')}
        action={
          <Button
            onClick={() => {
              const codes = apartments.map(() => generateInviteCode());
              toast.success(`${codes.length} coduri generate (ex: ${codes[0]})`);
            }}
          >
            <KeyRound className="h-4 w-4" /> {t('apartments.generateCodes')}
          </Button>
        }
      />
      {apartments.length === 0 ? (
        <EmptyState body={t('apartments.empty')} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th className="px-4 py-2">{t('apartments.scara')}</th>
                  <th className="px-4 py-2">{t('apartments.etaj')}</th>
                  <th className="px-4 py-2">{t('apartments.number')}</th>
                  <th className="px-4 py-2">{t('apartments.owner')}</th>
                  <th className="px-4 py-2">{t('apartments.area')}</th>
                  <th className="px-4 py-2">{t('apartments.share')}</th>
                </tr>
              </thead>
              <tbody>
                {apartments.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-2">{a.scara}</td>
                    <td className="px-4 py-2">{a.etaj === 0 ? 'Parter' : a.etaj}</td>
                    <td className="px-4 py-2 font-medium">{a.numar_apartament}</td>
                    <td className="px-4 py-2">{a.proprietar_principal_name}</td>
                    <td className="px-4 py-2">{a.suprafata_utila} m²</td>
                    <td className="px-4 py-2">
                      {a.cota_parte_indiviza
                        ? `${(a.cota_parte_indiviza * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 sm:hidden">
            {apartments.map((a) => (
              <Card key={a.id}>
                <p className="font-semibold">
                  Ap. {a.numar_apartament} · Sc. {a.scara} · Et. {a.etaj === 0 ? 'P' : a.etaj}
                </p>
                <p className="text-muted">{a.proprietar_principal_name}</p>
                <p className="text-sm text-muted">
                  {a.suprafata_utila} m² · cotă {(Number(a.cota_parte_indiviza) * 100).toFixed(1)}%
                </p>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Fond lunar estimat la 0,80 lei/m²:{' '}
            {formatLei(apartments.reduce((s, a) => s + (a.suprafata_utila ?? 0) * 0.8, 0))}
          </p>
        </>
      )}
    </div>
  );
}
