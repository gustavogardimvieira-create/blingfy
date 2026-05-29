import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import apiRouter from './server/routes/api.routes';
import { rateLimiter } from './server/middleware/rate-limit.middleware';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Register Global Rate Limiting on API requests and Mount Central API Routing
app.use('/api', rateLimiter, apiRouter);

// Initialize dev server or serve production front-end static bundle (Single-Page Application fallback)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bling Server] Express listening on http://localhost:${PORT}`);
  });
}

startServer();
