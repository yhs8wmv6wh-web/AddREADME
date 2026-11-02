// Ersatz für virtual:pwa-register/react im Artefakt-Build (dort gibt es keinen Service Worker).
export function useRegisterSW() {
  return { needRefresh: [false, () => {}] as const, offlineReady: [false, () => {}] as const, updateServiceWorker: async () => {} }
}
