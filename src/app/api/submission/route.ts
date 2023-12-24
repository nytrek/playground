import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import prisma from "../../db";

export const runtime = "edge";

/**
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */
export async function GET() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user)
    return new Response("unauthorized", {
      status: 401,
    });
  const submissions = await prisma.submission.findMany({
    where: {
      userId: user.id,
    },
  });
  return Response.json(submissions);
}
