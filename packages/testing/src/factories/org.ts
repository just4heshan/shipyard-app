export interface MockOrg {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: "FREE" | "PRO" | "ENTERPRISE";
  isActive: boolean;
  createdAt: string;
}

export function mockOrg(overrides: Partial<MockOrg> = {}): MockOrg {
  return {
    id: "org-1",
    name: "Acme Inc",
    slug: "acme-inc",
    subscriptionTier: "FREE",
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}
