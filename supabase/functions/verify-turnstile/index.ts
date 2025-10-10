import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

if (!TURNSTILE_SECRET_KEY) {
  throw new Error("TURNSTILE_SECRET_KEY environment variable is not set");
}

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const isTestToken = token.startsWith("XXXX.");
    const secretKey = isTestToken ? TEST_SECRET_KEY : TURNSTILE_SECRET_KEY;

    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    const outcome: TurnstileResponse = await verifyResponse.json();

    return new Response(
      JSON.stringify({
        success: outcome.success,
        errorCodes: outcome["error-codes"] || [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error verifying Turnstile token:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

