import { useSyncExternalStore } from 'react';

/** Assina uma media query (SSR-safe: falso no servidor). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (notify) => {
      if (typeof matchMedia !== 'function') return () => {};
      const mq = matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => (typeof matchMedia === 'function' ? matchMedia(query).matches : false),
    () => false,
  );
}
