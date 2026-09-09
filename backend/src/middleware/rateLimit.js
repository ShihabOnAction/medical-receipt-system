import rateLimit from 'express-rate-limit';

const message = (text) => ({ success: false, error: { code: 'RATE_LIMITED', message: text } });

const make = (windowMs, limit, text) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: message(text),
  });

/** Registration is the only unauthenticated write, so it is the tightest. */
export const registerLimiter = make(60 * 60 * 1000, 10, 'Too many registration attempts. Try again later.');

export const writeLimiter = make(60 * 1000, 60, 'Slow down a moment and try again.');

export const pdfLimiter = make(60 * 1000, 40, 'Too many PDF requests. Try again shortly.');

/**
 * Generous on purpose: a hospital's counters usually share one public IP, so
 * this must never throttle a busy morning - it only stops runaway clients.
 */
export const globalLimiter = make(60 * 1000, 600, 'Too many requests. Try again shortly.');
