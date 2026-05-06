/**
 * Maximum number of organizations a user can OWN (role = OWNER) per subscription tier.
 * Keys intentionally match the SubscriptionTier Prisma enum values.
 * Update these limits when billing is implemented.
 */
export const ORG_OWNER_LIMITS = {
  FREE: 1,
  PRO: 10,
  ENTERPRISE: Infinity,
} as const;

export type SubscriptionTierKey = keyof typeof ORG_OWNER_LIMITS;
