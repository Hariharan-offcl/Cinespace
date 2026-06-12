import 'dotenv/config';
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
const roomHosts = new Map();

// Helper to retrieve currently connected users in a room
const getRoomUsers = (roomCode: string, wss: any) => {
  const users: any[] = [];
  const hostName = roomHosts.get(roomCode);
  const seen = new Set();
  wss.clients.forEach((client: any) => {
    if (
      client.readyState === 1 &&
      client.roomCode === roomCode &&
      client.displayName &&
      !seen.has(client.displayName)
    ) {
      seen.add(client.displayName);
      users.push({
        displayName: client.displayName,
        isHost: client.displayName === hostName
      });
    }
  });
  return users;
};


app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = new URL(req.url!, `http://${hostname}:${port}`);
    handle(req, res, {
      pathname: parsedUrl.pathname,
      query: Object.fromEntries(parsedUrl.searchParams)
    } as any);
  });

  // Initialize WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  // Handle "Upgrade" requests (HTTP -> WebSocket)
  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = new URL(request.url!, `http://${hostname}:${port}`);

    if (parsedUrl.pathname === '/api/sync') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (!parsedUrl.pathname.startsWith('/_next')) {
      // Only destroy the socket if it's not our API AND not Next.js internal
      socket.destroy();
    }
    // If it's a /_next/ path, we don't call socket.destroy(),
    // allowing Next.js's own listeners to handle the HMR handshake.
  });

  // WebSocket Connection Logic
  wss.on('connection', (ws: any) => {
    console.log('New WebSocket connection established');

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        const { type, roomCode, payload } = message;

        // 1. User joins a room
        if (type === 'JOIN') {
          ws.roomCode = roomCode;
          ws.displayName = payload?.displayName || 'Anonymous';
          console.log(`User joined room: ${roomCode}, name: ${ws.displayName}`);

          // Set host if not set
          if (!roomHosts.has(roomCode)) {
            roomHosts.set(roomCode, ws.displayName);
          }

          // Broadcast USER_JOINED
          wss.clients.forEach((client: any) => {
            if (
              client.readyState === 1 &&
              client.roomCode === ws.roomCode
            ) {
              client.send(JSON.stringify({
                type: 'USER_JOINED',
                payload: {
                  displayName: ws.displayName
                }
              }));
            }
          });

          // Broadcast ROOM_USERS
          const usersList = getRoomUsers(roomCode, wss);
          wss.clients.forEach((client: any) => {
            if (
              client.readyState === 1 &&
              client.roomCode === roomCode
            ) {
              client.send(JSON.stringify({
                type: 'ROOM_USERS',
                payload: {
                  users: usersList
                }
              }));
            }
          });
          
          // If the room has an existing state (someone is already watching),
          // send that state to the new user immediately.
          if (rooms.has(roomCode)) {
            ws.send(JSON.stringify({
              type: 'SYNC_VIDEO',
              payload: rooms.get(roomCode)
            }));
          }
        }

        // 2. User syncs video state (play/pause/seek)
        if (type === 'SYNC_VIDEO' && ws.roomCode) {
          // Update our local "Zero-cost Redis" cache
          rooms.set(ws.roomCode, payload);

          // Broadcast the update to EVERYONE ELSE in the same room
          wss.clients.forEach((client: any) => {
            if (
              client !== ws && 
              client.readyState === 1 && // 1 = OPEN
              client.roomCode === ws.roomCode
            ) {
              client.send(JSON.stringify({
                type: 'SYNC_VIDEO',
                payload
              }));
            }
          });
        }

        // 3. User sends a chat message
        if (type === 'CHAT_MESSAGE' && ws.roomCode) {
          // Broadcast the message to EVERYONE in the room (including the sender)
          // so that the sender also gets a confirmation that it was sent.
          wss.clients.forEach((client: any) => {
            if (
              client.readyState === 1 && // 1 = OPEN
              client.roomCode === ws.roomCode
            ) {
              client.send(JSON.stringify({
                type: 'CHAT_MESSAGE',
                payload: {
                  ...payload,
                  timestamp: new Date().toISOString()
                }
              }));
            }
          });
        }

        // 4. User is typing
        if (type === 'TYPING' && ws.roomCode) {
          // Broadcast the typing status to EVERYONE ELSE in the room
          wss.clients.forEach((client: any) => {
            if (
              client !== ws &&
              client.readyState === 1 && // 1 = OPEN
              client.roomCode === ws.roomCode
            ) {
              client.send(JSON.stringify({
                type: 'TYPING',
                payload
              }));
            }
          });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      if (ws.roomCode && ws.displayName) {
        // If the disconnected client was the host, assign a new host
        if (roomHosts.get(ws.roomCode) === ws.displayName) {
          roomHosts.delete(ws.roomCode);
          let newHost: string | null = null;
          wss.clients.forEach((client: any) => {
            if (
              client !== ws &&
              client.readyState === 1 &&
              client.roomCode === ws.roomCode &&
              client.displayName
            ) {
              newHost = client.displayName;
            }
          });
          if (newHost) {
            roomHosts.set(ws.roomCode, newHost);
          }
        }

        // Broadcast USER_LEFT
        wss.clients.forEach((client: any) => {
          if (
            client !== ws &&
            client.readyState === 1 &&
            client.roomCode === ws.roomCode
          ) {
            client.send(JSON.stringify({
              type: 'USER_LEFT',
              payload: {
                displayName: ws.displayName
              }
            }));
          }
        });

        // Broadcast ROOM_USERS
        const usersList = getRoomUsers(ws.roomCode, wss);
        wss.clients.forEach((client: any) => {
          if (
            client.readyState === 1 &&
            client.roomCode === ws.roomCode
          ) {
            client.send(JSON.stringify({
              type: 'ROOM_USERS',
              payload: {
                users: usersList
              }
            }));
          }
        });
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
