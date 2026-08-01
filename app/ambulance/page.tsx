import type { Metadata } from "next";
import { WebAmbulanceScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Ambulance",
  description: "Request emergency transport and get connected with a nearby ambulance quickly.",
};

export default function AmbulancePage() {
  return <WebAmbulanceScreen />;
}
