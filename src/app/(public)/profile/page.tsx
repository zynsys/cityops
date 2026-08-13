import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ClipboardList } from "lucide-react";
import { auth } from "@auth";
import { getMyProfile } from "@/db/queries/users";
import AvatarUpload from "@/components/profile/AvatarUpload";
import DisplayNameForm from "@/components/profile/DisplayNameForm";
import ChangePasswordCard from "@/components/profile/ChangePasswordCard";

export const metadata = { title: "Account Settings — CityOps" };

function ProfileInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : parts[0].slice(0, 2);
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-semibold uppercase text-foreground border border-border sm:h-16 sm:w-16 sm:text-2xl">
      {initials}
    </span>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.userId) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const profile = await getMyProfile(session.user.userId);
  if (!profile) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const displayName = profile.displayName ?? profile.email;
  const reportCount = profile._count.submittedReports;

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Profile banner ────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar */}
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-14 w-14 shrink-0 rounded-full object-cover border border-border sm:h-16 sm:w-16"
              />
            ) : (
              <ProfileInitials name={displayName} />
            )}

            {/* Identity */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">{displayName}</h1>
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Joined {memberSince}
                </span>
                <Link
                  href="/my-reports"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  {reportCount} {reportCount === 1 ? "report" : "reports"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Settings ──────────────────────────────────────── */}
        <div className="mt-6 space-y-6">

          {/* Profile */}
          <section className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-3.5 sm:px-6">
              <h2 className="text-sm font-semibold text-foreground">Profile</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Photo */}
              <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="shrink-0">
                  <p className="text-sm font-medium text-foreground">Photo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 2 MB</p>
                </div>
                <AvatarUpload initialAvatarUrl={profile.avatarUrl} displayName={displayName} />
              </div>
              {/* Display name */}
              <div className="px-5 py-4 sm:px-6">
                <DisplayNameForm initialDisplayName={profile.displayName ?? ""} />
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-3.5 sm:px-6">
              <h2 className="text-sm font-semibold text-foreground">Account</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Email */}
              <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm font-medium text-foreground">Email address</p>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  disabled
                  className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed sm:w-64"
                  aria-label="Email address (read-only)"
                />
              </div>
              {/* Password */}
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm font-medium text-foreground">Password</p>
                <ChangePasswordCard email={profile.email} />
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
