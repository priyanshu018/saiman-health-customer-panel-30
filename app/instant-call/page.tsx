import type { Metadata } from "next";
import { WebInstantCallScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Instant Doctor Call",
  description: "Connect with an available doctor fast for urgent, non-emergency guidance.",
};

export default function InstantCallPage() {
  return <WebInstantCallScreen />;
}
