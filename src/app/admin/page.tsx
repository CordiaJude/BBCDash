import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminBoard } from "@/components/admin/AdminBoard";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "manager") redirect("/dashboard");
  return <AdminBoard />;
}
