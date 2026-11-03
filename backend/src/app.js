import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import env from './config/env.js';
import routes from './routes/index.js';
import { globalLimiter } from './middleware/rateLimit.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Render/Railway/Vercel sit behind a proxy - needed for correct client IPs.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // the API serves JSON + a self-contained print page
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // server-to-server calls and curl have no Origin header
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        env.frontendUrls.includes('*') ||
        env.frontendUrls.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      if (!env.isProd && /^http:\/\/localhost:\d+$/.test(cleanOrigin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(morgan(env.logLevel));
app.use('/api', globalLimiter);

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', service: 'medical-receipt-api', env: env.nodeEnv, time: new Date().toISOString() },
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
