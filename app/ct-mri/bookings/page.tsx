import type { Metadata } from "next";
import { WebCtmriBookingsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "CT / MRI Bookings",
  description: "Track your imaging appointments from request to completion.",
};

export default function CtmriBookingsPage() {
  return <WebCtmriBookingsScreen />;
}
