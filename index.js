const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const port = process.env.PORT || 4444;

const server = http.createServer((req, res) => {
  // Health check endpoint for Railway
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server });

// Map to track connected clients by topic
const topics = new Map();
// Map to track client metadata
const clients = new Map();

function generateClientId() {
  return crypto.randomBytes(16).toString('hex');
}

wss.on('connection', (ws) => {
  const clientId = generateClientId();
  clients.set(ws, {
    clientId,
    topics: new Set(),
  });

  console.log(`Client connected: ${clientId}`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const clientInfo = clients.get(ws);

      switch (message.type) {
        case 'subscribe': {
          // Subscribe to one or more topics
          const topicList = message.topics || [message.topic];
          for (const topic of topicList) {
            if (!topic) continue;
            if (!topics.has(topic)) {
              topics.set(topic, new Set());
            }
            topics.get(topic).add(ws);
            clientInfo.topics.add(topic);
            console.log(`Client ${clientId} subscribed to: ${topic}`);
          }
          break;
        }

        case 'unsubscribe': {
          // Unsubscribe from one or more topics
          const topicList = message.topics || [message.topic];
          for (const topic of topicList) {
            if (!topic) continue;
            const subscribers = topics.get(topic);
            if (subscribers) {
              subscribers.delete(ws);
              if (subscribers.size === 0) {
                topics.delete(topic);
              }
            }
            clientInfo.topics.delete(topic);
            console.log(`Client ${clientId} unsubscribed from: ${topic}`);
          }
          break;
        }

        case 'publish': {
          // Publish a message to a topic
          const topic = message.topic;
          const subscribers = topics.get(topic);

          if (subscribers) {
            const outMessage = JSON.stringify({
              type: 'publish',
              topic,
              from: clientId,
              data: message.data,
              message: message.message, // For y-webrtc compat
            });

            // If 'to' is specified, only send to that client
            if (message.to) {
              for (const client of subscribers) {
                const info = clients.get(client);
                if (info && info.clientId === message.to && client.readyState === WebSocket.OPEN) {
                  client.send(outMessage);
                  break;
                }
              }
            } else {
              // Broadcast to all subscribers except sender
              subscribers.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(outMessage);
                }
              });
            }
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        // Legacy support for old protocol
        case 'join-room': {
          const room = message.room;
          if (!topics.has(room)) {
            topics.set(room, new Set());
          }
          topics.get(room).add(ws);
          clientInfo.topics.add(room);
          console.log(`Client ${clientId} joined room (legacy): ${room}`);
          break;
        }

        case 'broadcast': {
          // Legacy broadcast to current room
          for (const topic of clientInfo.topics) {
            const subscribers = topics.get(topic);
            if (subscribers) {
              const outMessage = JSON.stringify({
                type: 'message',
                payload: message.payload,
                from: clientId,
              });
              subscribers.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(outMessage);
                }
              });
            }
          }
          break;
        }

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });

  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      // Remove from all topics
      for (const topic of clientInfo.topics) {
        const subscribers = topics.get(topic);
        if (subscribers) {
          subscribers.delete(ws);
          if (subscribers.size === 0) {
            topics.delete(topic);
          }
        }
      }
      console.log(`Client disconnected: ${clientInfo.clientId}`);
      clients.delete(ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send client their ID
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`WebSocket signaling server listening on port ${port}`);
  console.log(`Health check: http://0.0.0.0:${port}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
