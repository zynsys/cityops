import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@auth";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In — CityOps",
};

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
