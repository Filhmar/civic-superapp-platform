import { z } from 'zod';
import { MODULE_NAMES } from './tenant-config.types';

/** Runtime validator for the Reference §3 tenant-config contract — used by the
 * admin plane before any config version is written. */
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'must be a #RRGGBB color');

export const tenantConfigSchema = z.object({
  tenant_id: z.string().min(1),
  app: z.object({ name: z.string().min(1), tagline: z.string() }),
  brand: z.object({
    colors: z.object({
      primary: hexColor,
      primaryDark: hexColor,
      accent: hexColor,
      accentDeep: hexColor,
      danger: hexColor,
      tint: hexColor,
    }),
    logo: z.object({
      type: z.enum(['svg', 'image']),
      assets: z.record(z.string(), z.string()),
    }),
    slogan: z.string(),
    executive: z.object({
      title: z.string(),
      name: z.string(),
      photo: z.string(),
      greeting: z.string(),
    }),
  }),
  identifiers: z.object({
    ticket_prefix: z.string().regex(/^[A-Z]{2,5}$/),
    resident_id_prefix: z.string().regex(/^[A-Z]{2,5}$/),
  }),
  geo: z.object({
    centroid: z.tuple([z.number(), z.number()]),
    units: z.array(z.string().min(1)).min(1),
  }),
  locales: z.array(z.string()).min(1),
  onboarding: z
    .array(
      z.object({ title: z.string(), body: z.string(), bg: z.string(), image: z.string() }),
    )
    .length(3),
  home: z.object({ mayors_corner: z.boolean(), digital_id_promo: z.boolean() }),
  modules: z.object(
    Object.fromEntries(MODULE_NAMES.map((m) => [m, z.boolean()])) as Record<
      (typeof MODULE_NAMES)[number],
      z.ZodBoolean
    >,
  ),
  integrations: z.object({
    weather: z.string(),
    sms: z.string(),
    payments: z.array(z.enum(['gcash', 'card'])).min(1),
  }),
});

export type ValidatedTenantConfig = z.infer<typeof tenantConfigSchema>;
