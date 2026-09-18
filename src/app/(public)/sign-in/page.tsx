import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@auth';
import SignInForm from '@/components/auth/SignInForm';
import AuthShell from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Sign In — CityOps',
};

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect('/');

  return (
    <AuthShell>
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
