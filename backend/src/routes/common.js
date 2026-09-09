import { z } from 'zod';

/** Shared :id validator - every resource uses UUID keys. */
export const idParam = z.object({ id: z.string().uuid('Invalid identifier.') });
