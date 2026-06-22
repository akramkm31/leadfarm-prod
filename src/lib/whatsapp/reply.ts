/** Send a WhatsApp message via whapi.cloud. */

const WHAPI_BASE = "https://gate.whapi.cloud";

export async function sendWhatsAppReply(to: string, body: string): Promise<void> {
  const token = process.env.WHAPI_TOKEN;
  if (!token) {
    console.log(`[Mock WA Reply] → ${to}: ${body}`);
    return;
  }

  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, body, typing_time: 1 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whapi send error ${res.status}: ${err}`);
  }
}
