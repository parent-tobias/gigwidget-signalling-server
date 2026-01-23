const http = require('http');
const WebSocketServer = require('y-websocket-server').WebsocketServer;

const port = process.env.PORT || 4444;

const server = http.createServer();
const wsServer = new WebSocketServer({ server });

server.listen(port, () => {
  console.log(`y-websocket signaling server listening on port ${port}`);
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
