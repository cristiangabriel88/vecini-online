import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { generateQrDataUrl, qrDownloadFilename } from '@/shared/lib/qr';

interface QrCodeProps {
  /** The URL or text to encode in the QR code. */
  value: string;
  /** Human-readable label used for the download filename and alt text. */
  label?: string;
  /** Side length in pixels (default: 200). */
  size?: number;
}

/**
 * Shared QR-code display with a one-tap PNG download (T90).
 *
 * Renders `value` as a QR code using the `qrcode` library (Canvas API in the
 * browser, same library used for the admin-invite email QR in T153). Shows a
 * shimmer placeholder while the data URL is being generated. Silently returns
 * null on generation failure so the caller's layout is not disrupted.
 *
 * Usage:
 *   <QrCode value="https://app.vecini.online/configurare-cont?token=..." label="abc123" />
 */
export function QrCode({ value, label = 'code', size = 200 }: QrCodeProps) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setFailed(false);
    generateQrDataUrl(value, size)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  const onDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = qrDownloadFilename(label);
    a.click();
  };

  if (failed) return null;

  return (
    <div className="qr-code">
      {dataUrl ? (
        <>
          <img
            src={dataUrl}
            alt={t('common.qrCodeAlt', { label })}
            width={size}
            height={size}
            className="qr-code__img"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="qr-code__download"
          >
            <Download className="h-4 w-4" />
            {t('common.downloadQr')}
          </Button>
        </>
      ) : (
        <div
          className="skel"
          style={{ width: size, height: size, borderRadius: 'var(--radius-sm)' }}
          role="status"
          aria-label={t('common.loading')}
        />
      )}
    </div>
  );
}
