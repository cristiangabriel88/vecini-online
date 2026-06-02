// Client-side helper for proces-verbal download (T37).
//
// In live mode (Supabase configured, valid session) calls the
// generate-pv-pdf Netlify function and streams the binary PDF to a download.
// In demo/offline mode falls back to the existing plain-text download.

import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';
import { generateProcesVerbal } from '@/shared/lib/pvGenerator';
import type { AgaMeeting } from '@/shared/types/domain';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function textFallback(meeting: AgaMeeting): void {
  const text = generateProcesVerbal(meeting);
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `proces-verbal-${meeting.id}.txt`);
}

/** Download the proces-verbal for `meeting`.
 *  Returns `'pdf'` when the PDF was delivered, `'txt'` for the text fallback. */
export async function downloadProcesVerbalFile(
  meeting: AgaMeeting,
): Promise<'pdf' | 'txt'> {
  if (!isSupabaseConfigured) {
    textFallback(meeting);
    return 'txt';
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    textFallback(meeting);
    return 'txt';
  }

  const res = await fetch('/.netlify/functions/generate-pv-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ meetingId: meeting.id }),
  });

  if (!res.ok) {
    // Fall back to text so the user still gets the document
    textFallback(meeting);
    return 'txt';
  }

  const blob = await res.blob();
  const safeName = meeting.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '');
  downloadBlob(blob, `proces-verbal-${safeName}.pdf`);
  return 'pdf';
}
