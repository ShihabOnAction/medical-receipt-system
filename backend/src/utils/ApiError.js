export class ApiError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || httpCode(status);
    this.details = details;
    this.expected = true;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'You do not have access to this resource.') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Not found.') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message, details) {
    return new ApiError(409, message, 'CONFLICT', details);
  }
  static internal(message = 'Something went wrong. Please try again.') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

function httpCode(status) {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE',
      429: 'RATE_LIMITED',
    }[status] || 'INTERNAL_ERROR'
  );
}

export default ApiError;
