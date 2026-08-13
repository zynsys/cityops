import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@auth";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password — CityOps",
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session) redirect("/");
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <ForgotPasswordForm />
    </div>
  );
}
