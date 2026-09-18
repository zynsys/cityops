import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ClipboardList, LockKeyhole, UserRound } from 'lucide-react';
import { auth } from '@auth';
import { getMyProfile } from '@/db/queries/users';
import AvatarUpload from '@/components/profile/AvatarUpload';
import DisplayNameForm from '@/components/profile/DisplayNameForm';
import ChangePasswordCard from '@/components/profile/ChangePasswordCard';

export const metadata = { title: 'Account Settings — CityOps' };

function ProfileInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xl font-semibold uppercase text-foreground">
      {initials}
    </span>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.userId) {
    redirect('/sign-in?callbackUrl=/profile');
  }

  const profile = await getMyProfile(session.user.userId);
  if (!profile) {
    redirect('/sign-in?callbackUrl=/profile');
  }

  const displayName = profile.displayName ?? profile.email;
  const reportCount = profile._count.submittedReports;

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="page-shell max-w-5xl">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="page-title mt-3">Account Settings</h1>
          <p className="page-description">Manage your profile, account details and password.</p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* ── Account overview ──────────────────────────────── */}
        <section aria-labelledby="profile-summary-heading" className="surface-card min-w-0 p-6">
          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
            {/* Avatar */}
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <ProfileInitials name={displayName} />
            )}

            {/* Identity */}
            <div className="min-w-0">
              <h2
                id="profile-summary-heading"
                className="break-words text-xl font-semibold tracking-tight text-foreground"
              >
                {displayName}
              </h2>
              <p className="mt-1 break-all text-sm leading-relaxed text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              Joined {memberSince}
            </span>
            <Link
              href="/my-reports"
              className="inline-flex w-fit items-center gap-2 rounded-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
              {reportCount} {reportCount === 1 ? 'report' : 'reports'}
            </Link>
          </div>
        </section>

        {/* ── Settings ──────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {/* Profile */}
          <section aria-labelledby="profile-settings-heading" className="surface-card">
            <div className="flex items-start gap-3 border-b border-border p-5 sm:px-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="profile-settings-heading" className="text-base font-semibold text-foreground">
                  Profile
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Personalise your photo and display name.
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {/* Photo */}
              <div className="flex flex-col gap-5 p-5 sm:px-6">
                <div className="shrink-0">
                  <p className="text-sm font-medium text-foreground">Photo</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">JPG, PNG or WebP · max 2 MB</p>
                </div>
                <AvatarUpload initialAvatarUrl={profile.avatarUrl} displayName={displayName} />
              </div>
              {/* Display name */}
              <div className="p-5 sm:px-6">
                <DisplayNameForm initialDisplayName={profile.displayName ?? ''} />
              </div>
            </div>
          </section>

          {/* Account */}
          <section aria-labelledby="account-settings-heading" className="surface-card">
            <div className="flex items-start gap-3 border-b border-border p-5 sm:px-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="account-settings-heading" className="text-base font-semibold text-foreground">
                  Account
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Your sign-in details and password settings.
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {/* Email */}
              <div className="flex flex-col gap-3 p-5 sm:px-6">
                <p className="text-sm font-medium text-foreground">Email address</p>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  disabled
                  className="input-field bg-muted text-muted-foreground"
                  aria-label="Email address (read-only)"
                />
              </div>
              {/* Password */}
              <div className="flex flex-col gap-4 p-5 sm:px-6">
                <div>
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Request an email link to reset your password.
                  </p>
                </div>
                <ChangePasswordCard email={profile.email} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
