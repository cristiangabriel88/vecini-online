import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { useAuthStore } from '@/shared/store/authStore';
import { usePerfStore } from '@/shared/store/perfStore';
import { installGlobalErrorHandlers } from '@/shared/lib/errorReporting';
import { initErrorSink } from '@/shared/lib/errorSink';
import '@/styles/globals.css';
import '@/styles/tokens.css';
import '@/styles/primitives.css';
import '@/styles/shell.css';
import '@/styles/assistant.css';
import '@/styles/legal.css';
import '@/styles/welcome.css';
import '@/styles/perf-lite.css';

// Resolve the rendering tier before first paint (no flash). Priority:
// ?perf=<tier> URL param > persisted user preference > prefers-reduced-motion
// media query > stage default (dev/Pi = lite, prod/demo = full).
usePerfStore.getState().apply();

installGlobalErrorHandlers();
initErrorSink();
void useAuthStore.getState().init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
