import type { Metadata } from "next";
import { LoginForm } from "@/components/focuscasex/login-form";

export const metadata: Metadata = {
  title: "Sign in — Focus CaseX",
};

// Session presence is checked client-side (cookie or Bearer token) inside
// LoginForm, so this page renders directly in every browser environment.
export default function LoginPage() {
  return <LoginForm />;
}
