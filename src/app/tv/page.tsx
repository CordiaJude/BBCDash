import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TvBoard } from "@/components/tv/TvBoard";

export default async function TvPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <TvBoard />;
}
