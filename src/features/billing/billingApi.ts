import { supabase } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import type { Invoice, Subscription } from '@/shared/types/domain';
import { useBillingStore } from './billingStore';

export async function hydrateBilling(asociatieId: string): Promise<void> {
  const { setSubscription, setInvoices, setFetchError } = useBillingStore.getState();
  try {
    const [subRes, invRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('invoices')
        .select('*')
        .eq('asociatie_id', asociatieId)
        .order('issued_at', { ascending: false }),
    ]);
    if (subRes.error) throw subRes.error;
    if (invRes.error) throw invRes.error;
    if (subRes.data) setSubscription(subRes.data as Subscription);
    setInvoices(asociatieId, (invRes.data ?? []) as Invoice[]);
    setFetchError(null);
  } catch (err) {
    reportError(err, { source: 'hydrateBilling' });
    setFetchError('fetch-failed');
  }
}
