import { createServerClient } from "@/lib/supabase/server";

const WHAPI_TOKEN  = process.env.WHAPI_TOKEN || "";
const WHAPI_BASE   = "https://gate.whapi.cloud";
const PROD_GROUP   = process.env.WHAPI_PRODUCTION_GROUP_ID || "";

export type AlertEventType =
  | "DETECTION_MALADIE_CONFIRMEE"
  | "DETECTION_CRITIQUE"
  | "RUPTURE_STOCK"
  | "DLC_PRODUIT_PROCHE"
  | "METEO_BLOQUE_PLAN"
  | "CAPTEUR_SILENCIEUX"
  | "PLAN_VALIDE";

export interface AlertPayload {
  eventType:  AlertEventType;
  tenantId:   number;
  message:    string;
  data?:      Record<string, unknown>;
}

export async function fireAlert(payload: AlertPayload): Promise<void> {
  const supabase = createServerClient() as any;

  // 1. Fetch routing rules for this tenant + eventType
  const { data: routes } = await supabase
    .from("alert_routing")
    .select("canal, priorite, role_cible")
    .eq("id_tenant",  payload.tenantId)
    .eq("event_type", payload.eventType)
    .eq("actif",      true)
    .order("priorite", { ascending: true });

  if (!routes?.length) {
    console.log(`[Alert Engine] No active alert routes configured for ${payload.eventType}`);
    return;
  }

  // 2. Fetch users for each target role in this tenant
  const targetRoles = [...new Set(routes.map((r: any) => r.role_cible))];
  const { data: tenantUsers } = await supabase
    .from("tenant_utilisateur")
    .select("identifiant_utilisateur, role")
    .eq("identifiant_tenant", payload.tenantId)
    .eq("statut_acces", "actif")
    .in("role", targetRoles);

  if (!tenantUsers?.length) {
    console.log(`[Alert Engine] No active users found with roles ${targetRoles.join(", ")}`);
    return;
  }

  // Fetch their profile details from UTILISATEUR
  const userIds = tenantUsers.map((tu: any) => tu.identifiant_utilisateur);
  const { data: users } = await supabase
    .from("UTILISATEUR")
    .select("identifiant_utilisateur, nom_complet, adresse_email, numero_telephone")
    .in("identifiant_utilisateur", userIds);

  if (!users?.length) return;

  // 3. Dispatch per channel
  const dispatched = new Set<string>();

  for (const route of routes) {
    const roleUserIds = tenantUsers
      .filter((tu: any) => tu.role === route.role_cible)
      .map((tu: any) => tu.identifiant_utilisateur);

    const roleUsers = users.filter((u: any) => roleUserIds.includes(u.identifiant_utilisateur));

    for (const user of roleUsers) {
      const key = `${route.canal}:${user.identifiant_utilisateur}`;
      if (dispatched.has(key)) continue;
      dispatched.add(key);

      try {
        switch (route.canal) {
          case "WHATSAPP":
            await sendWhatsApp(user.numero_telephone || "", payload.message);
            break;
          case "EMAIL":
            await sendEmail(user.adresse_email || "", payload.eventType, payload.message);
            break;
          case "PUSH":
            await sendPushNotification(user.identifiant_utilisateur, payload.message);
            break;
        }
      } catch (err) {
        console.error(`Alert dispatch failed [${route.canal}] user ${user.identifiant_utilisateur}:`, err);
      }
    }
  }

  // 4. Log to ALERTE table
  try {
    await supabase.from("ALERTE").insert({
      message_alerte:   payload.message,
      canal_notification: routes.map((r: any) => r.canal).join(","),
      statut_alerte:    "envoyee",
      date_envoi:       new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to insert alert log:", err);
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, "");
  
  if (!WHAPI_TOKEN) {
    console.log(`[Mock WhatsApp] To ${cleanPhone}: "${message}"`);
    return;
  }

  const body = {
    to:   cleanPhone,
    body: message,
    typing_time: 0,
  };
  
  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${WHAPI_TOKEN}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whapi error: ${err}`);
  }
}

async function sendEmail(email: string, subject: string, body: string): Promise<void> {
  // Graceful log in local dev / standard environments
  console.log(`[Mock Email] To ${email} - Subject: ${subject} - Body: ${body}`);
  
  try {
    await fetch("/api/v1/notify/email", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ to: email, subject, body }),
    });
  } catch (err) {
    // Suppress local network fetch errors to prevent crash
  }
}

async function sendPushNotification(userId: number, message: string): Promise<void> {
  console.log(`[Mock Push] To User #${userId}: "${message}"`);
  
  try {
    await fetch("/api/v1/notify/push", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId, message }),
    });
  } catch (err) {
    // Suppress local network fetch errors
  }
}
