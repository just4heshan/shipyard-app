export interface MockUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface MockMember {
  id: string;
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
  user: Pick<MockUser, "id" | "name" | "image">;
}

export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-1",
    name: "Alice Smith",
    email: "alice@example.com",
    image: null,
    ...overrides,
  };
}

export function mockMember(overrides: Partial<MockMember> = {}): MockMember {
  return {
    id: "member-1",
    userId: "user-1",
    organizationId: "org-1",
    role: "MEMBER",
    joinedAt: "2024-01-01T00:00:00.000Z",
    user: {
      id: "user-1",
      name: "Alice Smith",
      image: null,
    },
    ...overrides,
  };
}
