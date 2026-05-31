import type { Metadata } from "next";
import HomeMaquette from "@/components/home/HomeMaquette";

export const metadata: Metadata = {
  title: "LeadFarm — Traçabilité phytosanitaire pour vergers industriels",
  description:
    "Plateforme de traçabilité phyto pour vergers industriels — parcelles, traitements, registres FOR.PR6 et audit GLOBALG.A.P.",
};

export default function HomePage() {
  return <HomeMaquette />;
}
