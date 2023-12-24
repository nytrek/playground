import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getSubmissions } from "./actions";
import Playground from "./playground";

export const runtime = "edge";

export default async function Page() {
  const { getUser } = getKindeServerSession();
  try {
    const user = await getUser();
    if (!user) return;
    const submissions = await getSubmissions({
      userId: user?.id,
    });
    console.log(submissions);
  } catch (error: any) {
    console.log(error.message);
  }
  return <Playground />;
}
