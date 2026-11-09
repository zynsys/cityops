import type { Metadata } from "next";
import AcceptInvitationForm from "@/components/auth/AcceptInvitationForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Accept Invitation — CityOps",
};

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;

  return (
    <AuthShell>
      <AcceptInvitationForm token={token} />
    </AuthShell>
  );
}
