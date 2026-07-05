/**
 * Verifies the live SOS WebSocket stream end-to-end:
 * open a session over HTTP, stream fixes over the /sos socket namespace,
 * confirm the dispatch room receives fan-out and the fixes are persisted.
 *   ts-node scripts/test-sos-ws.ts <bundleId> <accessToken>
 */
import { io } from 'socket.io-client';
import axios from 'axios';

async function main(): Promise<void> {
  const [bundle, token] = process.argv.slice(2);
  if (!bundle || !token) throw new Error('usage: test-sos-ws.ts <bundleId> <accessToken>');
  const api = axios.create({
    baseURL: 'http://localhost:3005/v1',
    headers: { 'X-Tenant-ID': bundle, Authorization: `Bearer ${token}` },
  });

  const open = await api.post('/sos/sessions', { lat: 14.32, lng: 120.93 });
  const sessionId = open.data.data.session_id as string;
  console.log('opened', sessionId);

  const socket = io('http://localhost:3005/sos', {
    auth: { token, tenant: bundle },
    transports: ['websocket'],
  });
  const received: unknown[] = [];
  socket.on('sos:location:update', (u) => received.push(u));

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', (e) => reject(e));
    setTimeout(() => reject(new Error('ws connect timeout')), 5000);
  });
  console.log('ws connected');

  for (let i = 0; i < 3; i++) {
    const ack = await socket
      .timeout(3000)
      .emitWithAck('sos:location', { session_id: sessionId, lat: 14.32 + i / 1000, lng: 120.93 });
    if (!ack?.received) throw new Error(`fix ${i} not acked: ${JSON.stringify(ack)}`);
  }
  await new Promise((r) => setTimeout(r, 300));
  console.log('streamed 3 fixes over WS, dispatch-room fan-out received:', received.length);

  const closed = await api.post(`/sos/sessions/${sessionId}/close`);
  const count = closed.data.data.location_count as number;
  console.log('closed with location_count =', count, count === 4 ? 'OK (1 open + 3 ws)' : 'MISMATCH');
  socket.disconnect();
  if (count !== 4 || received.length < 3) process.exit(1);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
