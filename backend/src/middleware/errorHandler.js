import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/** Maps the custom SQLSTATEs raised by our Postgres functions to HTTP. */
const PG_ERRORS = {
  P0001: [400, 'Select at least one test.'],
  P0002: [400, 'One of the selected tests is no longer available. Refresh and try again.'],
  P0004: [404, 'Receipt not found.'],
  P0005: [409, 'This receipt has already been cancelled.'],
  P0006: [403, 'Receipt items cannot be modified.'],
  23505: [409, 'That record already exists.'],
  23503: [400, 'A referenced record does not exist.'],
};

export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong.';
  let details = err.details;

  // Postgres / PostgREST errors surfaced by supabase-js
  if (!err.expected && err.code && PG_ERRORS[err.code]) {
    [status, message] = PG_ERRORS[err.code];
    code = err.code;
  } else if (!err.expected && typeof err.message === 'string' && err.message.startsWith('PRICE_CHANGED:')) {
    status = 409;
    code = 'PRICE_CHANGED';
    message = 'A test price changed while you were filling the form. Refresh the price list and try again.';
    details = { serverTotal: Number(err.message.split(':')[1]) };
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', req.method, req.originalUrl, '\n', err);
    if (env.isProd) message = 'Something went wrong. Please try again.';
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.isProd ? {} : { stack: err.stack?.split('\n').slice(0, 4) }),
    },
  });
}

export const throwIf = (error, fallback = 'Database request failed.') => {
  if (error) {
    const wrapped = new Error(error.message || fallback);
    wrapped.code = error.code;
    throw wrapped;
  }
};

export { ApiError };
export default errorHandler;
