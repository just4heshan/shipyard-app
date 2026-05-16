import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrgStore {
  activeOrgSlug: string | null;
  setActiveOrgSlug: (slug: string) => void;
}

export const useOrgStore = create<OrgStore>()(
  persist(
    (set) => ({
      activeOrgSlug: null,
      setActiveOrgSlug: (slug) => set({ activeOrgSlug: slug }),
    }),
    { name: "shipyard-active-org" },
  ),
);
