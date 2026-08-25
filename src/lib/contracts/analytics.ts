import { z } from 'zod';

export const UpsellEventRow = z.object({
  id: z.string(),
  eventType: z.string(),
  source: z.string().nullable(),
  email: z.string().nullable(),
  plan: z.string().nullable(),
  amountUsd: z.number().nullable(),
  createdAt: z.string(),
});

export const AdminAnalyticsResponse = z.object({
  totalClicks: z.number(),
  totalUpgrades: z.number(),
  conversionRate: z.number(),
  totalRevenueUsd: z.number(),
  recentEvents: z.array(UpsellEventRow),
});

export const EventTypeSchema = z.enum(['upsell_cta_view', 'click', 'upgrade']);

export const SurfaceFunnelRow = z.object({
  surface: z.string(),
  viewCount: z.number(),
  clickCount: z.number(),
  upgradeCount: z.number(),
  conversionRate: z.number(),
  revenueUsd: z.number(),
});

export const AnalyticsFunnelResponse = z.object({
  from: z.string(),
  to: z.string(),
  items: z.array(SurfaceFunnelRow),
});

export type UpsellEventRow = z.infer<typeof UpsellEventRow>;
export type AdminAnalyticsResponse = z.infer<typeof AdminAnalyticsResponse>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type SurfaceFunnelRow = z.infer<typeof SurfaceFunnelRow>;
export type AnalyticsFunnelResponse = z.infer<typeof AnalyticsFunnelResponse>;
