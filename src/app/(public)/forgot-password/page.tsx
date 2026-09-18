import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@auth';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import AuthShell from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Forgot Password — CityOps',
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session) redirect('/');
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
