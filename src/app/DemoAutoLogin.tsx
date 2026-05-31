import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';

/**
 * DEMO stage only: immediately calls enterDemo with the last-used role and
 * redirects to /app, bypassing LoginPage entirely. T174.
 */
export function DemoAutoLogin() {
  const demo = useAuthStore((s) => s.demo);
  const lastDemoRole = useAuthStore((s) => s.lastDemoRole);
  const enterDemo = useAuthStore((s) => s.enterDemo);

  useEffect(() => {
    if (!demo) enterDemo(lastDemoRole);
  }, [demo, enterDemo, lastDemoRole]);

  if (!demo) return null;
  return <Navigate to="/app" replace />;
}
