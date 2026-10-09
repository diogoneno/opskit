import { useSyncExternalStore } from 'react';

// Hash routing (#/slug): works on GitHub Pages without a 404 fallback and offline from the PWA cache.
export const slugFromHash = (hash: string) => hash.replace(/^#\/?/, '').split(/[?#]/)[0];
export const hrefFor = (slug: string) => `#/${slug}`;

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export const useRoute = () =>
  useSyncExternalStore(
    subscribe,
    () => slugFromHash(window.location.hash),
    () => '',
  );

export const navigate = (slug: string) => {
  window.location.hash = hrefFor(slug);
};
