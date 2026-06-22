/** Définitions d'outils (tool use) exposées à Claude. Exécutés côté client. */
export const ASSISTANT_TOOLS = [
  {
    name: "navigate",
    description:
      "Ouvre une page de l'application pour l'utilisateur. Utilise UNIQUEMENT un chemin présent dans la liste des pages autorisées fournie dans le contexte. Utilise cet outil dès que l'utilisateur demande à aller/ouvrir/voir une page.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin de la page, ex: /treatments" },
        reason: { type: "string", description: "Courte raison montrée à l'utilisateur" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_options",
    description:
      "Récupère les valeurs réelles existantes (parcelles, produits, opérateurs) pour proposer des choix exacts à l'utilisateur ou remplir une action. À appeler AVANT create_treatment pour connaître les noms de parcelles valides.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["parcelles", "products", "operators"] },
      },
      required: ["kind"],
    },
  },
  {
    name: "create_treatment",
    description:
      "Crée un traitement phytosanitaire planifié. Demande d'abord à l'utilisateur la parcelle et la date si elles manquent. Confirme un récapitulatif avant d'appeler cet outil.",
    input_schema: {
      type: "object",
      properties: {
        parcelle_name: { type: "string", description: "Nom exact de la parcelle (voir list_options)" },
        planned_date: { type: "string", description: "Date planifiée au format YYYY-MM-DD" },
        culture: { type: "string", description: "Culture concernée (optionnel)" },
        observations: { type: "string", description: "Notes / produit visé (optionnel)" },
      },
      required: ["parcelle_name", "planned_date"],
    },
  },
] as const;

export type AssistantToolName = (typeof ASSISTANT_TOOLS)[number]["name"];
