import ApiError from '../utils/ApiError.js';

/** Formats a ZodError into { field: message } for the frontend forms. */
function fieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const run = (schema, source) => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(ApiError.badRequest('Please correct the highlighted fields.', fieldErrors(result.error)));
  }
  req[source === 'query' ? 'validatedQuery' : source] = result.data;
  return next();
};

export const validateBody = (schema) => run(schema, 'body');
export const validateQuery = (schema) => run(schema, 'query');
export const validateParams = (schema) => run(schema, 'params');

export default validateBody;
