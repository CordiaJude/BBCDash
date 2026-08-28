import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardBoard } from "@/components/DashboardBoard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <DashboardBoard user={session} />;
}
