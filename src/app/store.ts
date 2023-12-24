import { Submission } from "@prisma/client";
import { create } from "zustand";

interface State {
  submissions: Submission[] | null;
  updateSubmissions: (submissions: Submission[]) => void;
}

/**
 * @see https://github.com/pmndrs/zustand
 * @see https://github.com/typehero/typehero/blob/main/apps/web/src/app/%5Blocale%5D/(playgrounds)/challenge-playground/challenge-playground-store.ts
 */
export const useSubmissionsStore = create<State>((set, get) => ({
  submissions: null,
  updateSubmissions: (submissions) =>
    set({ submissions: { ...get().submissions, ...submissions } }),
}));
