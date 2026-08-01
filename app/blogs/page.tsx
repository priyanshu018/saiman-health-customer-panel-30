import type { Metadata } from "next";
import { CustomerBlogsPage } from "@/components/customer-site-pages";

export const metadata: Metadata = {
  title: "Health Blogs",
  description: "Practical guidance on consultations, diagnostics, medicines, and staying healthy at home.",
};

export default function BlogsPage() {
  return <CustomerBlogsPage />;
}
