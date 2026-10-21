import { z } from 'zod';
import { normalizeUrl } from '../utils/url.js';
import { FIELD_TYPES, CHOICE_TYPES, DEFAULT_CONFIRMATION } from '../constants.js';

const fieldInput = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, 'Invalid field id'),
    type: z.enum(FIELD_TYPES),
    label: z.string().trim().min(1, 'Every question needs a title').max(300),
    description: z.string().trim().max(500).optional().default(''),
    required: z.boolean().optional().default(false),
    options: z.array(z.string().trim().min(1, 'Options cannot be empty').max(200)).max(50).optional().default([]),
    maxFiles: z.number().int().min(1).max(10).optional().default(1),
  })
  .superRefine((f, ctx) => {
    if (CHOICE_TYPES.includes(f.type)) {
      if (f.options.length < 1) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least one option' });
      } else if (new Set(f.options).size !== f.options.length) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'Options must be unique' });
      }
    }
  })
  .transform((f) => ({
    ...f,
    options: CHOICE_TYPES.includes(f.type) ? f.options : [],
    maxFiles: f.type === 'image' ? f.maxFiles : 1,
  }));

export const formInput = z
  .object({
    title: z.string().trim().min(1, 'Give your form a title').max(200),
    description: z.string().trim().max(2000).optional().default(''),
    fields: z.array(fieldInput).min(1, 'Add at least one question').max(100),
    confirmationMessage: z.string().trim().max(500).optional().default(DEFAULT_CONFIRMATION),
    closesAt: z.string().datetime({ offset: true }).nullable().optional(),
    maxResponses: z.number().int().min(1).max(1_000_000).nullable().optional(),
    resultsPublic: z.boolean().optional().default(true),
    socialLinks: z.array(z.string()).max(8).optional().default([]),
  })
  .superRefine((f, ctx) => {
    const ids = new Set();
    f.fields.forEach((q, i) => {
      if (ids.has(q.id)) ctx.addIssue({ code: 'custom', path: ['fields', i, 'id'], message: 'Duplicate field id' });
      ids.add(q.id);
    });
  })
  .transform((f, ctx) => {
    const socialLinks = [];
    for (const [i, raw] of f.socialLinks.entries()) {
      const url = normalizeUrl(raw);
      if (!url) {
        ctx.addIssue({ code: 'custom', path: ['socialLinks', i], message: 'Enter a valid link, e.g. instagram.com/yourname' });
        return z.NEVER;
      }
      if (!socialLinks.includes(url)) socialLinks.push(url);
    }
    return {
      ...f,
      socialLinks,
      confirmationMessage: f.confirmationMessage || DEFAULT_CONFIRMATION,
      closesAt: f.closesAt ? new Date(f.closesAt) : null,
      maxResponses: f.maxResponses ?? null,
    };
  });

export const statusInput = z.object({ isOpen: z.boolean() });
