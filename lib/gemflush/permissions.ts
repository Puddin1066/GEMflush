// Permission utilities for GEMflush features

import { Team } from '@/lib/db/schema';
import { GEMFLUSH_PLANS, getPlanById } from './plans';

export function canPublishToWikidata(team: Team): boolean {
  const plan = getPlanById(team.planName || 'free');
  return plan?.features.wikidataPublishing || false;
}

export function getMaxBusinesses(team: Team): number {
  const plan = getPlanById(team.planName || 'free');
  return plan?.features.maxBusinesses || 1;
}

export function canAccessHistoricalData(team: Team): boolean {
  const plan = getPlanById(team.planName || 'free');
  return plan?.features.historicalData || false;
}

export function canUseProgressiveEnrichment(team: Team): boolean {
  const plan = getPlanById(team.planName || 'free');
  return plan?.features.progressiveEnrichment || false;
}

export function canAccessAPI(team: Team): boolean {
  const plan = getPlanById(team.planName || 'free');
  return plan?.features.apiAccess || false;
}

export function getFingerprintFrequency(team: Team): 'monthly' | 'weekly' | 'daily' {
  const plan = getPlanById(team.planName || 'free');
  return plan?.features.fingerprintFrequency || 'monthly';
}

export async function canAddBusiness(businessCount: number, team: Team): Promise<boolean> {
  const maxBusinesses = getMaxBusinesses(team);
  return businessCount < maxBusinesses;
}

export function getBusinessLimitMessage(team: Team): string {
  const maxBusinesses = getMaxBusinesses(team);
  const planName = team.planName || 'free';
  
  if (planName === 'free') {
    return `Free plan allows ${maxBusinesses} business. Upgrade to Pro for up to 5 businesses.`;
  }
  
  if (planName === 'pro') {
    return `Pro plan allows ${maxBusinesses} businesses. Upgrade to Agency for up to 25 businesses.`;
  }
  
  return `Your plan allows ${maxBusinesses} businesses.`;
}

