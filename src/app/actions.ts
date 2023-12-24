"use server";

import type { Submission } from "@prisma/client";
import prisma from "./db";

/**
 * @see https://github.com/typehero/typehero/blob/main/apps/admin/src/app/dashboard/reports/%5Bid%5D/_actions.ts
 */

export async function getSubmissions({ userId }: Pick<Submission, "userId">) {
  return prisma.submission.findMany({
    where: {
      userId,
    },
  });
}

export async function createSubmission(
  data: Omit<Submission, "id" | "createdAt" | "updatedAt">,
) {
  return prisma.submission.create({
    data,
  });
}

export async function deleteSubmission({ id }: Pick<Submission, "id">) {
  return prisma.submission.delete({
    where: {
      id,
    },
  });
}
