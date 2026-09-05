import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SettingsBoard } from "@/components/admin/SettingsBoard";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <SettingsBoard user={session} />;
}
