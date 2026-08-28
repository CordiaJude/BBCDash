import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex-1 flex flex-col pb-8">
      <Nav user={session} />
      <main className="flex-1 mx-3 sm:mx-6 mt-4">{children}</main>
    </div>
  );
}
