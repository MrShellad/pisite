import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../../../api/client';

const LAST_ACTIVITY_KEY = 'flowcore_admin_last_activity';
const DEFAULT_TIMEOUT_MINUTES = 30;

type PublicAdminSecurityConfig = {
  sessionTimeoutMinutes: number;
};

export function useAdminSessionTimeout() {
  const navigate = useNavigate();
  const timeoutMinutesRef = useRef(DEFAULT_TIMEOUT_MINUTES);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('flowcore_admin_token');
    if (!token) return;

    const markActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    };

    const logoutForTimeout = () => {
      localStorage.removeItem('flowcore_admin_token');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      navigate('/admin/login', { replace: true, state: { reason: 'timeout' } });
    };

    markActivity();

    api
      .get<PublicAdminSecurityConfig>('/auth/admin-security')
      .then((response) => {
        if (!isMounted) return;
        const nextTimeout = Number(response.data.sessionTimeoutMinutes);
        if (Number.isFinite(nextTimeout) && nextTimeout > 0) {
          timeoutMinutesRef.current = nextTimeout;
        }
      })
      .catch(() => {
        timeoutMinutesRef.current = DEFAULT_TIMEOUT_MINUTES;
      });

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const intervalId = window.setInterval(() => {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      const timeoutMs = timeoutMinutesRef.current * 60 * 1000;
      if (Date.now() - lastActivity >= timeoutMs) {
        logoutForTimeout();
      }
    }, 15_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [navigate]);
}
