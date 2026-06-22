import type { Feature } from "@/lib/rbac/types";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Send,
  Star,
  ThumbsUp,
} from "lucide-react";

export type TreatmentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "planned"
  | "in_progress"
  | "completed"
  | "evaluated"
  | "cancelled";

/** Transitions autorisées (machine à états). */
export const STATUS_TRANSITIONS: Record<TreatmentStatus, TreatmentStatus[]> = {
  draft: ["pending_approval", "planned", "cancelled"],
  pending_approval: ["approved", "draft", "cancelled"],
  approved: ["in_progress", "planned", "cancelled"],
  planned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["evaluated", "cancelled"],
  evaluated: [],
  cancelled: [],
};

export type WorkflowActionKind = "plan" | "execute" | "evaluate";

export type WorkflowAction = {
  to: TreatmentStatus;
  label: string;
  icon: LucideIcon;
  kind: WorkflowActionKind;
  requiresModal?: "cloture" | "evaluation";
};

const PLAN_ACTIONS: Partial<Record<TreatmentStatus, WorkflowAction[]>> = {
  draft: [{ to: "pending_approval", label: "Soumettre pour approbation", icon: Send, kind: "plan" }],
  pending_approval: [
    { to: "approved", label: "Approuver", icon: ThumbsUp, kind: "plan" },
    { to: "draft", label: "Renvoyer en brouillon", icon: RotateCcw, kind: "plan" },
  ],
  approved: [{ to: "planned", label: "Publier l'ordre", icon: Send, kind: "plan" }],
};

const EXECUTE_ACTIONS: Partial<Record<TreatmentStatus, WorkflowAction[]>> = {
  planned: [{ to: "in_progress", label: "Démarrer sur le terrain", icon: Play, kind: "execute" }],
  in_progress: [
    { to: "completed", label: "Clôturer l'exécution", icon: CheckCircle2, kind: "execute", requiresModal: "cloture" },
  ],
  approved: [{ to: "in_progress", label: "Démarrer sur le terrain", icon: Play, kind: "execute" }],
};

const EVALUATE_ACTIONS: Partial<Record<TreatmentStatus, WorkflowAction[]>> = {
  completed: [
    { to: "evaluated", label: "Évaluer (J+7)", icon: Star, kind: "evaluate", requiresModal: "evaluation" },
  ],
};

export function canTransition(current: string, next: string): boolean {
  const allowed = STATUS_TRANSITIONS[current as TreatmentStatus];
  return allowed?.includes(next as TreatmentStatus) ?? false;
}

export function getWorkflowActions(
  status: string,
  permissions: { canPlan: boolean; canExecute: boolean }
): WorkflowAction[] {
  const actions: WorkflowAction[] = [];
  const s = status as TreatmentStatus;

  if (permissions.canPlan) {
    actions.push(...(PLAN_ACTIONS[s] ?? []));
  }
  if (permissions.canExecute) {
    actions.push(...(EXECUTE_ACTIONS[s] ?? []));
  }
  if (permissions.canPlan) {
    actions.push(...(EVALUATE_ACTIONS[s] ?? []));
  }

  return actions.filter((a) => canTransition(status, a.to));
}

export function workflowPermissionFlags(can: (f: Feature) => boolean) {
  return {
    canPlan: can("treatments.plan"),
    canExecute: can("treatments.execute"),
  };
}

/** Champs interdits à la création d'un ordre planifié (saisie terrain / RT plus tard). */
export const POST_PLAN_STRIP_FIELDS = [
  "dateReelle",
  "heureDebut",
  "heureFin",
  "qteProduitUtilise",
  "bouillonParCiterne",
  "nbCiternes",
  "efficacite",
  "visaRT",
] as const;
