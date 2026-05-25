import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { PlatformProviders } from '@/platform/PlatformProviders';
import { platformRouter } from '@/platform/platformRouter';
import { usePlatformAuthStore } from '@/platform/platformAuthStore';
import { useAuthStore } from '@/shared/store/authStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { installGlobalErrorHandlers } from '@/shared/lib/errorReporting';
import '@/styles/globals.css';
import '@/styles/tokens.css';
import '@/styles/primitives.css';
import '@/styles/shell.css';
import '@/styles/legal.css';
import '@/styles/platform.css';

installGlobalErrorHandlers();
// Restore any existing live session so the gate can verify it server-side. The
// platform app runs on its own origin, so this session store is isolated from
// the resident/admin app by the browser.
void useAuthStore.getState().init();

// Demo deep-link: a `?demo` flag (used by the resident login's superadmin
// preview) enters the demo console directly, surviving refresh while the flag
// stays in the URL. Honoured only with no backend configured; a real deployment
// always runs the server-side super_admin gate and ignores this.
if (!isSupabaseConfigured && new URLSearchParams(window.location.search).has('demo')) {
  usePlatformAuthStore.getState().enterDemo();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformProviders>
      <RouterProvider router={platformRouter} />
    </PlatformProviders>
  </StrictMode>,
);
