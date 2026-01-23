# Gigwidget Signaling Server

WebRTC signaling server for Gigwidget P2P collaboration using Yjs.

## Local Development

```bash
npm install
npm run dev
```

Server runs on `ws://localhost:4444`

## Deployment on Railway

1. Push this repo to GitHub
2. On Railway:
   - Click "New Project"
   - Select "GitHub Repo"
   - Choose this repository
   - Railway auto-detects Node.js and runs `npm start`
3. Once deployed, you'll get a domain like `gigwidget-signalling-server.up.railway.app`
4. Update `apps/web/src/lib/stores/sessionStore.svelte.ts` with the deployed URL:

```typescript
signalingServers = [
  'wss://gigwidget-signalling-server.up.railway.app', // Your Railway URL
  'wss://signaling.yjs.dev', // Fallback
];
```

## Environment Variables

- `PORT`: Set automatically by Railway (default: 4444)

## Troubleshooting

If the Railway deployment fails:
- Check logs: Railway UI shows deployment logs
- Ensure `package.json` exists with correct `start` script
- Verify Node.js version is 18+

## Notes

- This is a thin wrapper around `y-websocket-server`
- No custom logic needed; it just relays WebRTC signaling messages
- Can handle multiple concurrent Yjs clients
