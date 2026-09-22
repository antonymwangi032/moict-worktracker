import { useEffect, useRef } from 'react';
import { INACTIVITY_MS } from '../utils/constants';

export function useInactivityLogout({ active, onLogout, onWarn, warnMs = 30000 }) {
  const logoutTimer = useRef(null);
  const warnTimer = useRef(null);

  useEffect(() => {
    if (!active) return;

    const reset = () => {
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);

      warnTimer.current = setTimeout(() => {
        onWarn?.('⏰ Warning: You will be logged out in 30 seconds. Move the mouse or press any key to stay signed in.');
      }, Math.max(INACTIVITY_MS - warnMs, 5000));

      logoutTimer.current = setTimeout(() => onLogout?.(), INACTIVITY_MS);
    };

    reset();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => document.addEventListener(e, reset, true));

    return () => {
      events.forEach(e => document.removeEventListener(e, reset, true));
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
    };
  }, [active, onLogout, onWarn, warnMs]);
}