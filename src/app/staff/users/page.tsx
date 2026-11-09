import { redirect } from "next/navigation";
import { auth } from "@auth";
import InviteUserForm from "@/components/staff/InviteUserForm";

export default async function StaffUsersPage() {
  const session = await auth();
  if (session?.user.role !== "tenant_admin") redirect("/403");

  return (
    <main className="page-shell py-8 sm:py-12">
      <div className="mb-8">
        <p className="eyebrow">Council administration</p>
        <h1 className="page-title mt-3">Invite a team member</h1>
        <p className="page-description mt-2">
          Invite authority staff or another tenant administrator to join your council on CityOps.
        </p>
      </div>
      <InviteUserForm />
    </main>
  );
}
