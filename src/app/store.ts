import { create } from "zustand";
import { persist } from "zustand/middleware";

export const exercises = ["Linear search", "Binary search"] as const;

/**
 * @see https://github.com/pmndrs/zustand
 * @see https://github.com/typehero/typehero/blob/main/apps/web/src/app/%5Blocale%5D/(playgrounds)/challenge-playground/challenge-playground-store.ts
 */

interface State {
  exercise: (typeof exercises)[number];
  setExercise: (exercise: (typeof exercises)[number]) => void;
}

export const useExerciseStore = create<State>()(
  persist(
    (set) => ({
      exercise: "Linear search",
      setExercise: (exercise) => set({ exercise }),
    }),
    {
      name: "exercise",
    },
  ),
);
