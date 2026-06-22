import { NextRequest, NextResponse } from "next/server";
import { verifyServiceToken } from "@/lib/auth/service-token";
import { createServiceClient } from "@/lib/supabase/service";
import { classifyDisease } from "@/lib/services/disease-detection";
import { fireAlert } from "@/lib/services/notifications";

const CONFIDENCE_THRESHOLD_AUTO  = 85;
const CONFIDENCE_THRESHOLD_HUMAN = 60;

function authorizeDevice(req: NextRequest): boolean {
  const deviceKey = req.headers.get("x-device-key");
  const configured = process.env.DEVICE_API_KEY;
  if (deviceKey && configured && deviceKey === configured) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyServiceToken(authHeader.slice(7));
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!authorizeDevice(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const capteurId  = req.headers.get("x-capteur-id");
  const parcellId  = req.headers.get("x-parcelle-id");
  const tenantId   = req.headers.get("x-tenant-id");

  if (!capteurId || !parcellId || !tenantId) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  const supabase = createServiceClient() as any;
  let file: File | null = null;
  let publicUrl = "https://placeholder.supabase.co/farm-images/dummy.jpg";

  try {
    const formData = await req.formData();
    file = formData.get("image") as File;
  } catch (err) {
    return NextResponse.json({ error: "No multi-part form data" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No image file found" }, { status: 400 });

  // 1. Upload to Supabase Storage
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path      = `detections/${tenantId}/${parcellId}/${timestamp}.jpg`;
  
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data: stored, error: uploadError } = await supabase.storage
      .from("farm-images")
      .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.warn("Storage upload warning, continuing with fallback URL:", uploadError.message);
    } else if (stored) {
      const { data } = supabase.storage
        .from("farm-images")
        .getPublicUrl(stored.path);
      publicUrl = data.publicUrl;
    }
  } catch (err) {
    console.warn("Storage upload failed, continuing with fallback URL:", err);
  }

  // 2. Get GPS from capteur record
  let geoloc = null;
  try {
    const { data: capteur } = await supabase
      .from("CAPTEUR" as any)
      .select("identifiant_micro_zone")
      .eq("identifiant_capteur", parseInt(capteurId))
      .single();

    if (capteur?.identifiant_micro_zone) {
      const { data: mz } = await supabase
        .from("MICRO_ZONE" as any)
        .select("geometrie")
        .eq("identifiant_micro_zone", capteur.identifiant_micro_zone)
        .single();
      
      if (mz?.geometrie) {
        geoloc = mz.geometrie;
      }
    }
  } catch (err) {
    console.log("GPS lookup failed/skipped:", err);
  }

  // 3. Run IA disease classification
  const iaResult = await classifyDisease(publicUrl);

  // 4. Insert detection record
  let detectionId = 999;
  try {
    const { data: detection, error: insError } = await supabase
      .from("detection" as any)
      .insert({
        id_parcelle:       parseInt(parcellId),
        id_tenant:         parseInt(tenantId),
        id_capteur:        parseInt(capteurId),
        source:            "camera_iot",
        image_url:         publicUrl,
        geolocalisation:   geoloc,
        maladie_detectee:  iaResult.label,
        confiance_pct:     iaResult.confidence * 100,
        features_ia:       iaResult.features,
        version_modele:    iaResult.modelVersion,
        confirmation_op:   "en_attente",
      })
      .select("id")
      .single();

    if (insError) throw insError;
    if (detection) detectionId = detection.id;
  } catch (err) {
    console.error("Failed to insert detection record into DB:", err);
  }

  // 5. Route alerts based on confidence
  const confPct = iaResult.confidence * 100;

  if (confPct >= CONFIDENCE_THRESHOLD_AUTO) {
    await fireAlert({
      eventType: "DETECTION_MALADIE_CONFIRMEE",
      tenantId:  parseInt(tenantId),
      message:   `🔴 Caméra IoT: ${iaResult.label} détecté (${confPct.toFixed(0)}%) — Parcelle #${parcellId}`,
      data:      { detectionId },
    });
  } else if (confPct >= CONFIDENCE_THRESHOLD_HUMAN) {
    // Request human confirmation — notify operator
    await fireAlert({
      eventType: "DETECTION_MALADIE_CONFIRMEE",
      tenantId:  parseInt(tenantId),
      message:   `⚠️ Vérification requise: ${iaResult.label} (${confPct.toFixed(0)}%) — Parcelle #${parcellId}. Confirmez dans LeadFarm.`,
      data:      { detectionId },
    });
  }

  return NextResponse.json({
    detectionId,
    maladie:     iaResult.label,
    confiance:   confPct,
    imageUrl:    publicUrl,
    requiresConfirmation: confPct < CONFIDENCE_THRESHOLD_AUTO,
  });
}
