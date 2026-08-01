import type { Metadata } from "next";
import { WebSignupScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a Saiman Healthcare account to book doctors, order medicines, and more.",
};

export default function SignupPage() {
  return <WebSignupScreen />;
}
