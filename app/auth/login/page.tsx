import type { Metadata } from "next";
import { WebLoginScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to manage your appointments, orders, and care records.",
};

export default function LoginPage() {
  return <WebLoginScreen />;
}
