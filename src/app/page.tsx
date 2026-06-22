import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HomePage from "@/components/home/HomePage";

export const metadata: Metadata = {
  title: "LeadFarm — Traçabilité phytosanitaire · Vergers industriels",
  description:
    "Plateforme de référence pour la traçabilité phytosanitaire des vergers industriels — cahier de culture réglementaire, conformité GLOBALG.A.P. IFA v6, HACCP et suivi IFT.",
};

export default function Page() {
  if (process.env.APP_SITE === "app") {
    redirect("/login");
  }
  return <HomePage />;
}
