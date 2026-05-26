import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { useMyIdentity } from '@/features/profile/profileStore';
import { useWelcomeStore } from './welcomeStore';
import { WelcomeCarousel } from './WelcomeCarousel';
import { WelcomeProfile } from './WelcomeProfile';

/**
 * First-login welcome experience: a 3-slide presentation carousel followed by an
 * optional profile capture. Reached via `RequireWelcome` for first-time
 * residents (and replayable from the profile). Finishing or skipping either
 * phase marks the flow seen and drops the resident into the app.
 */
export default function WelcomePage() {
  const navigate = useNavigate();
  const { userId } = useMyIdentity();
  const markSeen = useWelcomeStore((s) => s.markSeen);
  const [phase, setPhase] = useState<'carousel' | 'profile'>('carousel');

  function complete() {
    markSeen(userId);
    navigate('/app', { replace: true });
  }

  return (
    <div className="welcome">
      <Atmosphere />
      <div className={`welcome__panel${phase === 'profile' ? ' welcome__panel--wide' : ''}`}>
        {phase === 'carousel' ? (
          <WelcomeCarousel onSkip={complete} onGetStarted={() => setPhase('profile')} />
        ) : (
          <WelcomeProfile onComplete={complete} />
        )}
      </div>
    </div>
  );
}
