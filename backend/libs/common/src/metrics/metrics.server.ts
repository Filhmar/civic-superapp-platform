import * as http from 'node:http';
import { Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Standalone prom-client HTTP server (deliberately NOT a Nest route — avoids
 * hybrid-app/interceptor interference on pure-TCP services, per STACK.md §7).
 */
export function startMetricsServer(serviceName: string, port: number): http.Server {
  const registry = new Registry();
  registry.setDefaultLabels({ service: serviceName });
  collectDefaultMetrics({ register: registry });

  const server = http.createServer((req, res) => {
    if (req.url === '/metrics') {
      registry
        .metrics()
        .then((body) => {
          res.setHeader('Content-Type', registry.contentType);
          res.end(body);
        })
        .catch(() => {
          res.statusCode = 500;
          res.end();
        });
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  server.on('error', (err) => {
    // Metrics must never take a service down (e.g. port collision in local dev).
    console.warn(`[metrics] ${serviceName} metrics server error: ${err.message}`);
  });
  server.listen(port);
  return server;
}
