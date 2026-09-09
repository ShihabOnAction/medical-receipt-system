import { z } from 'zod';
import env from '../config/env.js';

const trimmed = (max) => z.string().trim().max(max);
const optionalText = (max) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === 'string' ? v.trim() : ''))
    .refine((v) => v.length <= max, { message: `Must be ${max} characters or fewer.` })
    .transform((v) => (v === '' ? null : v));

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === 'string' ? v.trim() : ''))
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Use the YYYY-MM-DD format.' })
  .transform((v) => (v === '' ? null : v));

const optionalTime = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === 'string' ? v.trim() : ''))
  .refine((v) => v === '' || /^([01]?\d|2[0-3]):[0-5]\d(\s?(AM|PM|am|pm))?$/.test(v), {
    message: 'Use a time such as 14:30.',
  })
  .transform((v) => (v === '' ? null : v));

/** Server-side gate on registration e-mail domains (never trust the browser). */
export const allowedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid e-mail address.')
  .refine(
    (value) => env.allowedEmailDomains.some((domain) => value.endsWith(`@${domain}`)),
    {
      message: `Registration is limited to ${env.allowedEmailDomains
        .map((d) => `@${d}`)
        .join(', ')} addresses.`,
    }
  );

export const registerSchema = z
  .object({
    fullName: trimmed(120).min(2, 'Enter your full name.'),
    email: allowedEmail,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be 72 characters or fewer.')
      .regex(/[A-Za-z]/, 'Password must contain a letter.')
      .regex(/\d/, 'Password must contain a number.'),
    confirmPassword: z.string(),
    phone: optionalText(30),
    designation: optionalText(80),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  fullName: trimmed(120).min(2, 'Enter your full name.').optional(),
  phone: optionalText(30).optional(),
  designation: optionalText(80).optional(),
});

export const receiptCreateSchema = z.object({
  patientName: trimmed(150).min(2, "Enter the patient's name."),
  age: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 150), {
      message: 'Age must be between 0 and 150.',
    }),
  ageUnit: z.enum(['Y', 'M', 'D']).default('Y'),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select a sex.' }) }),
  refBy: optionalText(150),
  opdWard: optionalText(80),
  bedNumber: optionalText(40),
  regNumber: optionalText(60),
  receiptDate: optionalDate,
  testIds: z
    .array(z.string().uuid('Invalid test reference.'))
    .min(1, 'Select at least one test.')
    .max(40, 'A receipt can hold at most 40 tests.'),
  expectedTotal: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message: 'Invalid total.' }),
  reportDeliveryDate: optionalDate,
  reportDeliveryTime: optionalTime,
  bankOfficer: optionalText(120),
  preparedBy: optionalText(120),
  remarks: optionalText(500),
});

export const receiptListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional().default(''),
  from: z.string().trim().optional().default(''),
  to: z.string().trim().optional().default(''),
  createdBy: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'VOID', 'ALL']).default('ACTIVE'),
  sort: z.enum(['newest', 'oldest', 'amount_desc', 'amount_asc']).default('newest'),
});

export const testCreateSchema = z.object({
  name: trimmed(200).min(2, 'Enter the test name.'),
  shortCode: optionalText(30),
  category: trimmed(50).default('GENERAL'),
  price: z.coerce.number().min(0, 'Price cannot be negative.').max(1000000),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).max(100000).default(0),
});

export const testUpdateSchema = testCreateSchema.partial();

export const testReorderSchema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), displayOrder: z.coerce.number().int().min(0) })).min(1),
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional().default(''),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ALL']).default('ALL'),
  role: z.enum(['ADMIN', 'STAFF', 'ALL']).default('ALL'),
});

export const userStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  reason: optionalText(300),
});

export const userRoleSchema = z.object({
  role: z.enum(['ADMIN', 'STAFF']),
});

export const voidReceiptSchema = z.object({
  reason: trimmed(300).min(5, 'Give a reason of at least 5 characters.'),
});

export const settingsUpdateSchema = z.object({
  hospitalName: trimmed(150).min(2).optional(),
  hospitalNameBn: optionalText(150).optional(),
  hospitalAddress: trimmed(200).optional(),
  departmentName: trimmed(150).optional(),
  receiptTitle: trimmed(150).optional(),
  logoUrl: optionalText(500).optional(),
  bankName: optionalText(120).optional(),
  bankAccountLabel: optionalText(60).optional(),
  bankAccountNumber: optionalText(60).optional(),
  currencySymbol: trimmed(10).optional(),
  currencyWord: trimmed(20).optional(),
  footerNote: optionalText(300).optional(),
  serialPadding: z.coerce.number().int().min(3).max(10).optional(),
  serialPrefix: optionalText(10).optional(),
  printTableRows: z.coerce.number().int().min(1).max(40).optional(),
  themePrimary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #0f766e.')
    .optional(),
  themeAccent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #0284c7.')
    .optional(),
  pdfFontFamily: trimmed(120).optional(),
  pdfBaseFontSize: z.coerce.number().int().min(8).max(20).optional(),
  showBankBox: z.boolean().optional(),
  showWardFields: z.boolean().optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  action: z.string().trim().max(60).optional().default(''),
  userId: z.string().uuid().optional(),
  from: z.string().trim().optional().default(''),
  to: z.string().trim().optional().default(''),
});
