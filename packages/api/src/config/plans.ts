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

/**
 * Maximum number of members (active + pending invitations) per organization per tier.
 * Update when billing is implemented.
 */
export const MEMBER_LIMITS = {
  FREE: 5,
  PRO: 25,
  ENTERPRISE: Infinity,
} as const;

/**
 * Maximum number of active projects per organization per tier.
 * Update when billing is implemented.
 */
export const PROJECT_LIMITS = {
  FREE: 1,
  PRO: Infinity,
  ENTERPRISE: Infinity,
} as const;
