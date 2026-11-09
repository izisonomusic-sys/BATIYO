import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha512(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function readPayload(req: Request): Promise<any> {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) return await req.json();
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const data = params.get("data");
  if (data) { try { return { data: JSON.parse(data) }; } catch { /* try plain form fields */ } }
  const obj: Record<string, unknown> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  if (typeof obj.data === "string") { try { obj.data = JSON.parse(obj.data); } catch { /* invalid */ } }
  return obj;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!masterKey || !supabaseUrl || !serviceKey) return json({ error: "webhook_not_configured" }, 503);

  try {
    const payload = await readPayload(req);
    const data = payload?.data ?? payload;
    const receivedHash = String(data?.hash || "");
    const expectedHash = await sha512(masterKey);
    if (!receivedHash || !safeEqual(receivedHash.toLowerCase(), expectedHash)) return json({ error: "invalid_signature" }, 401);

    const token = String(data?.invoice?.token || data?.token || "").trim();
    const status = String(data?.status || "").toLowerCase();
    const amount = Number(data?.invoice?.total_amount ?? data?.total_amount);
    if (!token || !["completed", "cancelled", "canceled", "failed", "pending"].includes(status) || !Number.isFinite(amount)) {
      return json({ error: "invalid_payload" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: sub, error: findError } = await admin.from("business_subscriptions")
      .select("id,status,amount_fcfa,billing_period_months,starts_at,ends_at")
      .eq("provider", "paydunya_softpay").eq("provider_reference", token).maybeSingle();
    if (findError) throw findError;
    if (!sub) return json({ error: "subscription_not_found" }, 404);
    if (Number(sub.amount_fcfa) !== amount) return json({ error: "amount_mismatch" }, 409);

    if (status === "completed") {
      if (sub.status === "active") return json({ received: true, already_processed: true });
      const now = new Date();
      const start = now.toISOString();
      const end = new Date(now.getTime());
      end.setUTCMonth(end.getUTCMonth() + Number(sub.billing_period_months));
      const { error } = await admin.from("business_subscriptions").update({
        status: "active", starts_at: start, ends_at: end.toISOString(), provider: "paydunya_softpay",
        payment_reference: token, updated_at: start
      }).eq("id", sub.id).eq("status", "pending");
      if (error) throw error;
      return json({ received: true, activated: true });
    }

    if (status === "failed" || status === "cancelled" || status === "canceled") {
      if (sub.status === "pending") {
        const { error } = await admin.from("business_subscriptions")
          .update({ status: status === "failed" ? "failed" : "cancelled", updated_at: new Date().toISOString() })
          .eq("id", sub.id).eq("status", "pending");
        if (error) throw error;
      }
      return json({ received: true, status });
    }
    return json({ received: true, status: "pending" });
  } catch (error) {
    console.error("PayDunya webhook error", error);
    return json({ error: "webhook_processing_failed" }, 500);
  }
});