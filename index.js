const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 4444;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Map to track connected clients by room
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  let currentRoom = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const { type, room, payload } = message;

      if (type === 'join-room') {
        currentRoom = room;
        if (!rooms.has(room)) {
          rooms.set(room, new Set());
        }
        rooms.get(room).add(ws);
        console.log(`Client joined room: ${room} (${rooms.get(room).size} clients)`);
      } else if (type === 'broadcast' && currentRoom) {
        // Broadcast to all clients in the room except sender
        const roomClients = rooms.get(currentRoom);
        if (roomClients) {
          roomClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'message',
                payload,
              }));
            }
          });
        }
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const roomClients = rooms.get(currentRoom);
      if (roomClients) {
        roomClients.delete(ws);
        console.log(`Client left room: ${currentRoom} (${roomClients.size} clients)`);
        if (roomClients.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(port, () => {
  console.log(`WebSocket signaling server listening on port ${port}`);
  console.log(`ws://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
