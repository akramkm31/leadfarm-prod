"use client";

import { useMemo } from "react";
import { useTreatments } from "@/hooks/useData";
import type { Treatment } from "@/lib/mock-data";

export type OperateurLead = {
  tone: "red" | "amber" | "blue" | "green";
  title: string;
  sub: string;
  href: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function useOperateurMetrics() {
  const { data: treatRaw } = useTreatments();
  const treatments = (treatRaw ?? []) as Treatment[];

  return useMemo(() => {
    const today = todayStr();

    const inProgress = treatments.filter((t) => t.status === "in_progress");
    const todayPlanned = treatments.filter(
      (t) =>
        (t.status === "approved" || t.status === "planned") &&
        t.plannedDate?.slice(0, 10) === today
    );
    const overdue = treatments.filter(
      (t) =>
        (t.status === "approved" || t.status === "planned") &&
        t.plannedDate &&
        t.plannedDate.slice(0, 10) < today
    );

    const upcomingTasks = [...inProgress, ...todayPlanned, ...overdue.slice(0, 2)].slice(0, 5);

    // Treatments finished recently — show re-entry countdown if windSpeed/conditions recorded
    const recentCompleted = treatments
      .filter((t) => t.status === "completed" && t.completedDate)
      .sort((a, b) => (b.completedDate! > a.completedDate! ? 1 : -1))
      .slice(0, 3);

    let lead: OperateurLead;
    if (inProgress.length > 0) {
      lead = {
        tone: "blue",
        href: "/treatments?status=in_progress",
        title: `${inProgress.length} traitement${inProgress.length > 1 ? "s" : ""} en cours`,
        sub: inProgress.map((t) => t.sousParcelleName || t.parcelleName).slice(0, 2).join(", "),
      };
    } else if (overdue.length > 0) {
      lead = {
        tone: "red",
        href: "/treatments",
        title: `${overdue.length} traitement${overdue.length > 1 ? "s" : ""} en retard`,
        sub: "Planifié avant aujourd'hui — à exécuter",
      };
    } else if (todayPlanned.length > 0) {
      lead = {
        tone: "amber",
        href: "/treatments",
        title: `${todayPlanned.length} tâche${todayPlanned.length > 1 ? "s" : ""} aujourd'hui`,
        sub: todayPlanned.map((t) => t.sousParcelleName || t.parcelleName).slice(0, 2).join(", "),
      };
    } else {
      lead = {
        tone: "green",
        href: "/treatments",
        title: "Aucune tâche planifiée",
        sub: "Tournée libre",
      };
    }

    return { inProgress, todayPlanned, overdue, upcomingTasks, recentCompleted, lead,
      counts: { inProgress: inProgress.length, today: todayPlanned.length, overdue: overdue.length } };
  }, [treatments]);
}
