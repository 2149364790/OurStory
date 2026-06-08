import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidEmail = Deno.env.get("VAPID_EMAIL") ?? "mailto:love@couplespace.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured in Edge Function environment variables.");
    }

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    // Initialize Supabase Client with service role to bypass RLS and read subscriptions
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { recipient_id, title, body, url } = await req.json();

    if (!recipient_id) {
      throw new Error("recipient_id is required");
    }

    // Query active subscriptions for recipient
    const { data: subs, error: queryError } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipient_id);

    if (queryError) throw queryError;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active subscriptions for recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const payload = JSON.stringify({
      title: title || "收到新通知 💖",
      body: body || "有新的互动，快去看看吧！",
      url: url || "/"
    });

    const sendPromises = subs.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushSubscription, payload)
        .catch(async (err) => {
          console.error(`Failed to send to endpoint: ${sub.endpoint}`, err);
          // If subscription has expired or is invalid (404/410), delete it from DB
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log(`Removing expired subscription: ${sub.id}`);
            await supabaseClient.from("push_subscriptions").delete().eq("id", sub.id);
          }
        });
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, message: `Push notifications sent to ${subs.length} devices` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
