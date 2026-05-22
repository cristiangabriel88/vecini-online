import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { useAuthStore } from '@/shared/store/authStore';
import '@/styles/globals.css';
import '@/styles/tokens.css';
import '@/styles/primitives.css';
import '@/styles/shell.css';

void useAuthStore.getState().init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
