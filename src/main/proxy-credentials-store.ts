/**
 * Global in-process store that maps session partition → proxy credentials.
 *
 * agent-engine.ts writes here before creating a WebContents;
 * the app.on('login') handler in index.ts reads here to supply
 * credentials for 407 Proxy Auth Required challenges.
 *
 * This is the only fully-reliable approach for HTTPS CONNECT proxy auth
 * in Electron 30 — embedded URL credentials are stripped by Chromium's
 * network stack for CONNECT tunnels, and session/wc-level login events
 * fire too late or not at all.
 */

interface ProxyCredentials {
  username: string;
  password: string;
}

const store = new Map<string, ProxyCredentials>();

export function setProxyCredentials(partition: string, creds: ProxyCredentials): void {
  store.set(partition, creds);
}

export function getProxyCredentials(partition: string): ProxyCredentials | undefined {
  return store.get(partition);
}

export function deleteProxyCredentials(partition: string): void {
  store.delete(partition);
}
