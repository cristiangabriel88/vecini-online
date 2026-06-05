import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { useAuthStore } from '@/shared/store/authStore';
import { installGlobalErrorHandlers } from '@/shared/lib/errorReporting';
import { initErrorSink } from '@/shared/lib/errorSink';
import { isDev } from '@/shared/lib/env';
import '@/styles/globals.css';
import '@/styles/tokens.css';
import '@/styles/primitives.css';
import '@/styles/shell.css';
import '@/styles/assistant.css';
import '@/styles/legal.css';
import '@/styles/welcome.css';
import '@/styles/perf-lite.css';

// Pick the rendering tier before first paint so the lite overrides apply with no
// flash. The Pi (dev stage) gets the "lite" tier, which drops the GPU-expensive
// glass/blur layer its VideoCore GPU cannot composite smoothly; every other stage
// keeps the full premium look.
document.documentElement.dataset.perf = isDev() ? 'lite' : 'full';

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
