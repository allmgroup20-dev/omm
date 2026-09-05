import { createRemoteJWKSet, jwtVerify } from "jose";
import { getEnv } from "./env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export function googleConfig() {
  // Secrets uploaded via stdin pipe can carry a trailing newline — trim it,
  // otherwise Google rejects the exchange and id_token audience check fails.
  const clientId = getEnv("GOOGLE_CLIENT_ID").trim();
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET").trim();
  const appUrl = getEnv("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  return {
    clientId,
    clientSecret,
    appUrl,
    redirectUri: `${appUrl}/api/auth/google/callback`,
  };
}

export function isGoogleConfigured(): boolean {
  const { clientId, clientSecret } = googleConfig();
  return Boolean(clientId && clientSecret);
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = googleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Google token exchange failed");
  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("No id_token from Google");

  const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  const { payload } = await jwtVerify(tokens.id_token, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  const email = payload.email as string | undefined;
  if (!email) throw new Error("Google account has no email");
  return {
    sub: payload.sub as string,
    email,
    emailVerified: (payload.email_verified as boolean) === true,
    name: ((payload.name as string) || email.split("@")[0]).slice(0, 80),
    picture: payload.picture as string | undefined,
  };
}
