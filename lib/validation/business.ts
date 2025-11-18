// Business validation schemas using Zod

import { z } from 'zod';

export const businessLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// Enhanced location extraction schema (for crawled data)
export const extractedLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional().default('US'),
  postalCode: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const businessCategorySchema = z.enum([
  'restaurant',
  'retail',
  'healthcare',
  'professional_services',
  'home_services',
  'automotive',
  'beauty',
  'fitness',
  'entertainment',
  'education',
  'real_estate',
  'technology',
  'other',
]);

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name too long'),
  url: z.string().url('Must be a valid URL'),
  category: businessCategorySchema.optional(),
  location: businessLocationSchema,
});

// New schema for URL-only creation (frictionless onboarding)
export const createBusinessFromUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  // All other fields optional - will be extracted from crawl
  name: z.string().min(2).max(200).optional(),
  category: businessCategorySchema.optional(),
  location: businessLocationSchema.optional(),
});

export const updateBusinessSchema = createBusinessSchema.partial();

export const crawlRequestSchema = z.object({
  businessId: z.number().int().positive(),
  forceRecrawl: z.boolean().optional().default(false),
});

export const fingerprintRequestSchema = z.object({
  businessId: z.number().int().positive(),
  includeCompetitors: z.boolean().optional().default(true),
});

export const wikidataPublishRequestSchema = z.object({
  businessId: z.number().int().positive(),
  publishToProduction: z.boolean().optional().default(false),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type BusinessCategory = z.infer<typeof businessCategorySchema>;

