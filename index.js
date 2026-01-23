import WebsocketServer from 'y-websocket-server';

const port = process.env.PORT || 4444;

const server = new WebsocketServer.Server({ port });

console.log(`y-websocket signaling server listening on port ${port}`);
console.log(`ws://localhost:${port}`);
