/**
 * local-proxy.ts — Per-visit local HTTP/CONNECT proxy tunnel
 *
 * Problem: Chromium strips auth credentials from HTTPS CONNECT requests even
 * when embedded in proxyRules, and app.on('login') doesn't fire reliably for
 * residential proxies that drop the connection instead of returning 407.
 *
 * Solution: Spin up a tiny local HTTP server on 127.0.0.1 for each visit.
 * Electron talks to localhost (no auth needed). The local server handles
 * CONNECT itself, opening a raw TCP connection to the upstream proxy and
 * injecting the Proxy-Authorization header manually. The upstream proxy sees
 * a properly authenticated CONNECT and creates the tunnel.
 *
 * Usage:
 *   const lp = await startLocalProxy({ host, port, username, password });
 *   await ses.setProxy({ proxyRules: `http://127.0.0.1:${lp.port}` });
 *   // ... do visit ...
 *   lp.close();
 */

import * as http from 'http';
import * as net from 'net';

export interface LocalProxy {
  port: number;
  close: () => void;
}

export interface UpstreamProxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function startLocalProxy(upstream: UpstreamProxy): Promise<LocalProxy> {
  return new Promise((resolve, reject) => {
    const authHeader = upstream.username
      ? `Basic ${Buffer.from(`${upstream.username}:${upstream.password ?? ''}`).toString('base64')}`
      : null;

    const server = http.createServer((clientReq, clientRes) => {
      // ── Plain HTTP requests ──────────────────────────────────────────────
      // Forward the request to the upstream proxy as-is, injecting auth.
      const options: http.RequestOptions = {
        host: upstream.host,
        port: upstream.port,
        method: clientReq.method,
        path: clientReq.url,
        headers: { ...clientReq.headers },
      };
      if (authHeader) {
        (options.headers as Record<string, string>)['Proxy-Authorization'] = authHeader;
      }
      const proxyReq = http.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
      });
      proxyReq.on('error', () => clientRes.end());
      clientReq.pipe(proxyReq, { end: true });
    });

    server.on('connect', (req, clientSocket, head) => {
      // ── HTTPS CONNECT tunnel ─────────────────────────────────────────────
      // Open a raw TCP connection to the upstream proxy.
      const upstreamSocket = net.connect(upstream.port, upstream.host);

      upstreamSocket.on('error', () => {
        clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      });

      upstreamSocket.on('connect', () => {
        // Send CONNECT to the upstream proxy with auth baked in.
        const connectLines = [
          `CONNECT ${req.url} HTTP/1.1`,
          `Host: ${req.url}`,
          authHeader ? `Proxy-Authorization: ${authHeader}` : null,
          'Proxy-Connection: Keep-Alive',
          '\r\n',
        ].filter(Boolean).join('\r\n');

        upstreamSocket.write(connectLines);

        // Read the upstream response to our CONNECT request.
        let responseBuffer = '';
        const onData = (chunk: Buffer) => {
          responseBuffer += chunk.toString('utf8');
          const headerEnd = responseBuffer.indexOf('\r\n\r\n');
          if (headerEnd === -1) return; // haven't received full header yet

          upstreamSocket.removeListener('data', onData);

          const statusLine = responseBuffer.slice(0, responseBuffer.indexOf('\r\n'));
          const statusCode = parseInt(statusLine.split(' ')[1] ?? '0', 10);

          if (statusCode >= 200 && statusCode < 300) {
            // Tell the browser the tunnel is open.
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

            // Pipe any data that arrived after the header to the client.
            const leftover = responseBuffer.slice(headerEnd + 4);
            if (leftover.length > 0) {
              clientSocket.write(leftover);
            }
            if (head.length > 0) {
              upstreamSocket.write(head);
            }

            // Bidirectional pipe.
            upstreamSocket.pipe(clientSocket);
            clientSocket.pipe(upstreamSocket);
          } else {
            // Tunnel refused — tell the browser.
            clientSocket.end(`HTTP/1.1 ${statusCode} Proxy Error\r\n\r\n`);
            upstreamSocket.destroy();
          }
        };

        upstreamSocket.on('data', onData);
        upstreamSocket.on('error', () => {
          clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        });
        clientSocket.on('error', () => upstreamSocket.destroy());
      });
    });

    server.on('error', reject);

    // Bind to a random free port on loopback only.
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({
        port: addr.port,
        close: () => {
          try { server.closeAllConnections?.(); } catch { /* ignore */ }
          server.close();
        },
      });
    });
  });
}
