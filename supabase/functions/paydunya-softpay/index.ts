import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" }
});

const PLANS: Record<string, { months: number; amount: number; label: string }> = {
  "1-mois": { months: 1, amount: 3500, label: "BATIYO Pro - 1 mois" },
  "2-mois": { months: 2, amount: 7000, label: "BATIYO Pro - 2 mois" },
  "6-mois": { months: 6, amount: 35000, label: "BATIYO Pro - 6 mois" }
};

type PaymentInput = {
  country: string;
  endpoint: string;
  needsOtp?: boolean;
  build: (name: string, email: string, phone: string, address: string, token: string, otp: string) => Record<string, string>;
};

const PAYMENT_METHODS: Record<string, PaymentInput> = {
  "t-money-togo": {
    country: "TG", endpoint: "t-money-togo",
    build: (name, email, phone, _address, token) => ({ name_t_money: name, email_t_money: email, phone_t_money: phone, payment_token: token })
  },
  "moov-togo": {
    country: "TG", endpoint: "moov-togo",
    build: (name, email, phone, address, token) => ({ moov_togo_customer_fullname: name, moov_togo_email: email, moov_togo_customer_address: address, moov_togo_phone_number: phone, payment_token: token })
  },
  "moov-benin": {
    country: "BJ", endpoint: "moov-benin",
    build: (name, email, phone, _address, token) => ({ moov_benin_customer_fullname: name, moov_benin_email: email, moov_benin_phone_number: phone, payment_token: token })
  },
  "mtn-benin": {
    country: "BJ", endpoint: "mtn-benin",
    build: (name, email, phone, _address, token) => ({ mtn_benin_customer_fullname: name, mtn_benin_email: email, mtn_benin_phone_number: phone, mtn_benin_wallet_provider: "MTNBENIN", payment_token: token })
  },
  "celtiis-cash": {
    country: "BJ", endpoint: "celtiis-cash",
    build: (name, email, phone, _address, token) => ({ celtiis_cash_customer_fullname: name, celtiis_cash_customer_email: email, celtiis_cash_phone_number: phone, payment_token: token })
  },
  "mtn-ci": {
    country: "CI", endpoint: "mtn-ci",
    build: (name, email, phone, _address, token) => ({ mtn_ci_customer_fullname: name, mtn_ci_email: email, mtn_ci_phone_number: phone, mtn_ci_wallet_provider: "MTNCI", payment_token: token })
  },
  "moov-ci": {
    country: "CI", endpoint: "moov-ci",
    build: (name, email, phone, _address, token) => ({ moov_ci_customer_fullname: name, moov_ci_email: email, moov_ci_phone_number: phone, payment_token: token })
  },
  "wave-ci": {
    country: "CI", endpoint: "wave-ci",
    build: (name, email, phone, _address, token) => ({ wave_ci_fullName: name, wave_ci_email: email, wave_ci_phone: phone, wave_ci_payment_token: token })
  },
  "orange-money-ci": {
    country: "CI", endpoint: "orange-money-ci", needsOtp: true,
    build: (name, email, phone, _address, token, otp) => ({ orange_money_ci_customer_fullname: name, orange_money_ci_email: email, orange_money_ci_phone_number: phone, orange_money_ci_otp: otp, payment_token: token })
  },
  "djamo-ci": {
    country: "CI", endpoint: "djamo",
    build: (name, email, phone, _address, token) => ({ djamo_fullName: name, djamo_email: email, djamo_phone: phone, code_country: "ci", djamo_payment_token: token })
  },
  "free-money-senegal": {
    country: "SN", endpoint: "free-money-senegal",
    build: (name, email, phone, _address, token) => ({ customer_name: name, customer_email: email, phone_number: phone, payment_token: token })
  },
  "expresso-senegal": {
    country: "SN", endpoint: "expresso-senegal",
    build: (name, email, phone, _address, token) => ({ expresso_sn_fullName: name, expresso_sn_email: email, expresso_sn_phone: phone, payment_token: token })
  },
  "wave-senegal": {
    country: "SN", endpoint: "wave-senegal",
    build: (name, email, phone, _address, token) => ({ wave_senegal_fullName: name, wave_senegal_email: email, wave_senegal_phone: phone, wave_senegal_payment_token: token })
  },
  "new-orange-money-senegal": {
    country: "SN", endpoint: "new-orange-money-senegal",
    build: (name, email, phone, _address, token) => ({ customer_name: name, customer_email: email, phone_number: phone, invoice_token: token })
  },
  "djamo-sn": {
    country: "SN", endpoint: "djamo",
    build: (name, email, phone, _address, token) => ({ djamo_fullName: name, djamo_email: email, djamo_phone: phone, code_country: "sn", djamo_payment_token: token })
  },
  "orange-money-burkina": {
    country: "BF", endpoint: "orange-money-burkina", needsOtp: true,
    build: (name, email, phone, _address, token, otp) => ({ name_bf: name, email_bf: email, phone_bf: phone, otp_code: otp, payment_token: token })
  },
  "moov-burkina": {
    country: "BF", endpoint: "moov-burkina",
    build: (name, email, phone, _address, token) => ({ moov_burkina_faso_fullName: name, moov_burkina_faso_email: email, moov_burkina_faso_phone_number: phone, moov_burkina_faso_payment_token: token })
  },
  "orange-money-mali": {
    country: "ML", endpoint: "orange-money-mali",
    build: (name, email, phone, address, token) => ({ orange_money_mali_customer_fullname: name, orange_money_mali_email: email, orange_money_mali_phone_number: phone, orange_money_mali_customer_address: address, payment_token: token })
  },
  "moov-mali": {
    country: "ML", endpoint: "moov-mali",
    build: (name, email, phone, address, token) => ({ moov_ml_customer_fullname: name, moov_ml_email: email, moov_ml_phone_number: phone, moov_ml_customer_address: address, payment_token: token })
  }
};

const COUNTRY_PREFIX: Record<string, string> = {
  TG: "+228", BJ: "+229", CI: "+225", SN: "+221", BF: "+226", ML: "+223"
};

function allowedActionUrl(payment: any, operator: string): string | null {
  const candidates = [
    payment?.url,
    payment?.other_url?.om_url,
    payment?.other_url?.maxit_url
  ].filter((value) => typeof value === "string" && value.length > 0);
  const allowedHosts: Record<string, string[]> = {
    "wave-ci": ["pay.wave.com"],
    "wave-senegal": ["pay.wave.com"],
    "djamo-ci": ["p.djamo.com"],
    "djamo-sn": ["p.djamo.com"],
    "new-orange-money-senegal": ["orangemoneysn.page.link", "sugu.orange-sonatel.com"]
  };
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "https:" && (allowedHosts[operator] || []).includes(parsed.hostname)) return parsed.toString();
    } catch { /* ignore malformed or unexpected links */ }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY") || "";
  const privateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY") || "";
  const paydunyaToken = Deno.env.get("PAYDUNYA_TOKEN") || "";
  const mode = (Deno.env.get("PAYDUNYA_MODE") || "test").toLowerCase();
  if (!supabaseUrl || !anonKey || !serviceKey || !masterKey || !privateKey || !paydunyaToken) {
    return json({ error: "payment_not_configured", message: "Les clés PayDunya doivent être configurées dans les secrets Supabase." }, 503);
  }
  if (!authHeader.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "invalid_session" }, 401);

    const body = await req.json();
    const planId = String(body.plan_id || "");
    const countryCode = String(body.country_code || "").toUpperCase();
    const operator = String(body.operator || "");
    const customerName = String(body.customer_name || "").trim();
    const phone = String(body.phone || "").replace(/[\s().-]/g, "").replace(/^00/, "+");
    const email = String(body.email || authData.user.email || "").trim();
    const address = String(body.address || "").trim() || countryCode;
    const otp = String(body.otp || "").trim();
    const plan = PLANS[planId];
    const method = PAYMENT_METHODS[operator];

    if (!plan) return json({ error: "invalid_plan", message: "Formule d’abonnement inconnue." }, 400);
    if (!method || method.country !== countryCode) {
      return json({ error: "unsupported_country_or_operator", message: "Ce moyen de paiement n’est pas disponible pour le pays sélectionné avec PayDunya SoftPay." }, 400);
    }
    if (customerName.length < 2 || !/^\+[1-9]\d{7,14}$/.test(phone) || !phone.startsWith(COUNTRY_PREFIX[countryCode]) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "invalid_customer_details", message: "Nom, e-mail et numéro international correspondant au pays sélectionné requis." }, 400);
    }
    if (method.needsOtp && !/^\d{4,8}$/.test(otp)) {
      return json({ error: "invalid_payment_code", message: "Le code de paiement OTP fourni par l’opérateur est requis." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("business_id,full_name").eq("id", authData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.business_id) return json({ error: "business_not_found", message: "Aucune entreprise BATIYO n’est associée à ce compte." }, 404);

    const { data: sub, error: insertError } = await admin.from("business_subscriptions").insert({
      business_id: profile.business_id,
      plan_id: planId,
      status: "pending",
      billing_period_months: plan.months,
      amount_fcfa: plan.amount,
      provider: "paydunya_softpay",
      metadata: {
        country_code: countryCode, operator, phone, customer_name: customerName,
        customer_email: email, address, mode
      }
    }).select("id").single();
    if (insertError) throw insertError;

    const apiBase = mode === "live" ? "https://app.paydunya.com/api/v1" : "https://app.paydunya.com/sandbox-api/v1";
    const headers = {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": masterKey,
      "PAYDUNYA-PRIVATE-KEY": privateKey,
      "PAYDUNYA-TOKEN": paydunyaToken
    };
    const callbackUrl = supabaseUrl + "/functions/v1/paydunya-webhook";
    const invoiceResponse = await fetch(apiBase + "/checkout-invoice/create", {
      method: "POST",
      headers,
      body: JSON.stringify({
        invoice: { total_amount: plan.amount, description: plan.label + " (" + countryCode + ")" },
        store: { name: "BATIYO" },
        custom_data: { subscription_id: sub.id, business_id: profile.business_id, plan_id: planId, country_code: countryCode, operator },
        actions: { callback_url: callbackUrl }
      })
    });
    const invoice = await invoiceResponse.json();
    if (!invoiceResponse.ok || String(invoice.response_code) !== "00" || !invoice.token) {
      await admin.from("business_subscriptions").update({ status: "failed" }).eq("id", sub.id);
      return json({ error: "invoice_creation_failed", message: invoice.response_text || invoice.description || "PayDunya n’a pas créé la facture." }, 502);
    }

    await admin.from("business_subscriptions").update({ provider_reference: invoice.token }).eq("id", sub.id);
    const localPhone = phone.slice(COUNTRY_PREFIX[countryCode].length);
    const softpayBody = method.build(customerName, email, localPhone, address, invoice.token, otp);
    const paymentResponse = await fetch(apiBase + "/softpay/" + method.endpoint, {
      method: "POST", headers, body: JSON.stringify(softpayBody)
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || payment.success !== true) {
      await admin.from("business_subscriptions").update({ status: "failed" }).eq("id", sub.id).eq("status", "pending");
      return json({
        error: "softpay_request_failed",
        message: payment.message || payment.errors?.message || "PayDunya ou l’opérateur a refusé la demande de paiement."
      }, 502);
    }

    const actionUrl = allowedActionUrl(payment, operator);
    return json({
      success: true,
      subscription_id: sub.id,
      invoice_token: invoice.token,
      status: "pending",
      message: payment.message || "Demande envoyée. Validez le paiement sur votre téléphone ou dans l’application de l’opérateur.",
      action_url: actionUrl,
      action_label: actionUrl ? "Ouvrir l’application de paiement de votre opérateur" : null,
      country_code: countryCode,
      operator,
      amount_fcfa: plan.amount
    });
  } catch (error) {
    console.error("PayDunya SoftPay error", error);
    return json({ error: "payment_initialization_failed", message: "Impossible d’initialiser le paiement. Réessayez plus tard." }, 500);
  }
});
