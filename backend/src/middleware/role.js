import ApiError from '../utils/ApiError.js';

/** Restricts a route to one or more roles. Use after authenticate. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('This action is restricted to administrators.'));
    }
    return next();
  };

export const requireAdmin = requireRole('ADMIN');

export default requireRole;
