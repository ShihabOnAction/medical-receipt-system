import { z } from 'zod';

/**
 * Client-side mirrors of the server schemas. These exist purely to give
 * instant feedback - the API validates everything again and is the only
 * authority.
 */

export const GMAIL_DOMAIN = 'gmail.com';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'E-mail is required.')
  .email('Enter a valid e-mail address.');

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
    email: emailSchema.refine((v) => v.endsWith(`@${GMAIL_DOMAIN}`), {
      message: `Only @${GMAIL_DOMAIN} addresses can register.`,
    }),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    designation: z.string().trim().max(80).optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'At least 8 characters.')
      .max(72)
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const receiptSchema = z.object({
  patientName: z.string().trim().min(2, "Enter the patient's name.").max(150),
  age: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || (/^\d{1,3}$/.test(v) && Number(v) <= 150), { message: 'Age must be 0-150.' }),
  ageUnit: z.enum(['Y', 'M', 'D']).default('Y'),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select a sex.' }) }),
  refBy: z.string().trim().max(150).optional().or(z.literal('')),
  opdWard: z.string().trim().max(80).optional().or(z.literal('')),
  bedNumber: z.string().trim().max(40).optional().or(z.literal('')),
  regNumber: z.string().trim().max(60).optional().or(z.literal('')),
  receiptDate: z.string().trim().optional().or(z.literal('')),
  reportDeliveryDate: z.string().trim().optional().or(z.literal('')),
  reportDeliveryTime: z.string().trim().optional().or(z.literal('')),
  bankOfficer: z.string().trim().max(120).optional().or(z.literal('')),
  preparedBy: z.string().trim().max(120).optional().or(z.literal('')),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
});

export const testSchema = z.object({
  name: z.string().trim().min(2, 'Enter the test name.').max(200),
  shortCode: z.string().trim().max(30).optional().or(z.literal('')),
  category: z.string().trim().max(50).optional().or(z.literal('')),
  price: z
    .string()
    .trim()
    .min(1, 'Enter a price.')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), { message: 'Use a number such as 1200 or 1200.50.' }),
  isActive: z.boolean().default(true),
  displayOrder: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^\d+$/.test(v), { message: 'Use a whole number.' }),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  designation: z.string().trim().max(80).optional().or(z.literal('')),
});

export const settingsSchema = z.object({
  hospitalName: z.string().trim().min(2, 'Required.').max(150),
  hospitalNameBn: z.string().trim().max(150).optional().or(z.literal('')),
  hospitalAddress: z.string().trim().max(200).optional().or(z.literal('')),
  departmentName: z.string().trim().max(150).optional().or(z.literal('')),
  receiptTitle: z.string().trim().max(150).optional().or(z.literal('')),
  logoUrl: z.string().trim().max(500).optional().or(z.literal('')),
  bankName: z.string().trim().max(120).optional().or(z.literal('')),
  bankAccountLabel: z.string().trim().max(60).optional().or(z.literal('')),
  bankAccountNumber: z.string().trim().max(60).optional().or(z.literal('')),
  currencySymbol: z.string().trim().max(10).optional().or(z.literal('')),
  currencyWord: z.string().trim().max(20).optional().or(z.literal('')),
  footerNote: z.string().trim().max(300).optional().or(z.literal('')),
  serialPadding: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 3 && Number(v) <= 10, {
    message: 'Between 3 and 10.',
  }),
  serialPrefix: z.string().trim().max(10).optional().or(z.literal('')),
  printTableRows: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 40, {
    message: 'Between 1 and 40.',
  }),
  themePrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour.'),
  themeAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour.'),
  pdfFontFamily: z.string().trim().max(120).optional().or(z.literal('')),
  pdfBaseFontSize: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 8 && Number(v) <= 20, {
    message: 'Between 8 and 20.',
  }),
  showBankBox: z.boolean().default(true),
  showWardFields: z.boolean().default(true),
});
