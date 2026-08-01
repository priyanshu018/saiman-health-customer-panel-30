import type { Metadata } from "next";
import { WebPaymentCallbackScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Payment Confirmation",
  description: "Confirming your payment status.",
};

export default function PaymentCallbackPage() {
  return <WebPaymentCallbackScreen />;
}
