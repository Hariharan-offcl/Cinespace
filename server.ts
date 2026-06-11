import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Room Cache (In-memory replacement for Redis)
const rooms = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  // Handle "Upgrade" requests (HTTP -> WebSocket)
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url!, true);

    if (pathname === '/api/sync') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // WebSocket Connection Logic
  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection established');

    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
      // Logic for broadcasting sync state will go here in the next step
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
