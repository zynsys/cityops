import { redirect } from "next/navigation";
import { auth } from "@auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin"]);

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";

  if (!session || !ALLOWED_ROLES.has(role)) {
    redirect("/403");
  }

  return <>{children}</>;
}
