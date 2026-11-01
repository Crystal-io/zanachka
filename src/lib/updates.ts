import { registerSW } from 'virtual:pwa-register';

/** How often to look for a new version while the app stays open. */
const CHECK_EVERY_MS = 30 * 60_000;

/** Screens without unsaved input: the reload into a new version waits for one of them. */
const SAFE_PATHS = new Set(['/', '/history', '/accounts', '/settings', '/settings/categories', '/plan']);

let registration: ServiceWorkerRegistration | undefined;
let reloadPending = false;

const currentPath = () => location.hash.replace(/^#/, '').split('?')[0] || '/';

/** Reloads into the new version once the user is on a safe screen. Also called on every route change. */
export function applyPendingUpdate() {
  if (reloadPending && SAFE_PATHS.has(currentPath())) {
    reloadPending = false;
    window.location.reload();
  }
}

registerSW({
  immediate: true,
  // The new version is already installed and active; only the open page is still the old one.
  onNeedReload() {
    reloadPending = true;
    applyPendingUpdate();
  },
  onRegisteredSW(_url, r) {
    registration = r;
    if (!r) return;
    const check = () => void r.update().catch(() => {});
    // Android resumes an installed app without reloading it, so look again on every return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, CHECK_EVERY_MS);
  },
});

export type UpdateCheck = 'updating' | 'latest' | 'offline' | 'unsupported';

/** Manual check from «Ещё». A found version installs and reloads on its own. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!registration) return 'unsupported';
  try {
    await registration.update();
  } catch {
    return 'offline';
  }
  return registration.installing || registration.waiting || reloadPending ? 'updating' : 'latest';
}
