import { env } from "cloudflare:workers";

function decode(segment: string) {
  const base64 = segment.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), c => c.charCodeAt(0));
}

function decodeJson(segment: string) {
  return JSON.parse(new TextDecoder().decode(decode(segment)));
}

export async function getAccessUser(headers: Headers) {
  return verifyAccessToken(headers.get("cookie")?.match(/(?:^|;\s*)__Host-atlas-session=([^;]+)/)?.[1]);
}

export async function verifyAccessToken(token: string | undefined, reject: (reason: string) => void = () => {}) {
  const fail = (reason: string) => { reject(reason); return null; };
  const issuer = env.ATLAS_ACCESS_ISSUER;
  const audience = env.ATLAS_ACCESS_AUDIENCE;
  if (!issuer || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience) return fail("configuration");

  if (!token || token.length > 8192) return fail("token-size");

  let stage = "token-decode";
  try {
    const [encodedHeader, encodedClaims, signature, extra] = token.split(".");
    if (!encodedHeader || !encodedClaims || !signature || extra !== undefined) return fail("token-format");
    const header = decodeJson(encodedHeader);
    const claims = decodeJson(encodedClaims);
    const now = Date.now() / 1000;
    if (header.alg !== "RS256" || typeof header.kid !== "string") return fail("algorithm");
    if (claims.iss !== issuer) return fail("issuer");
    if (claims.type !== undefined && claims.type !== "app") return fail("token-type");
    if (!Array.isArray(claims.aud) || !claims.aud.includes(audience)) return fail("audience");
    if (typeof claims.exp !== "number" || claims.exp <= now ||
        (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > now))) return fail("token-time");
    if (typeof claims.sub !== "string" || !claims.sub ||
        typeof claims.email !== "string" || !claims.email) return fail("identity");

    stage = "key-fetch";
    // Workers supports manual redirects. Only accept a direct response from the configured issuer.
    const response = await fetch(issuer + "/cdn-cgi/access/certs", {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 200) return fail("key-response");
    stage = "key-decode";
    const { keys } = await response.json<{ keys: (JsonWebKey & { kid?: string })[] }>();
    const jwk = keys.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return fail("key-id");
    const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    stage = "key-import";
    const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
    stage = "signature-check";
    const signed = new TextEncoder().encode(encodedHeader + "." + encodedClaims);
    if (!await crypto.subtle.verify(algorithm, key, decode(signature), signed)) return fail("signature");
    return { userId: "access:" + claims.sub, email: claims.email, displayName: claims.email, fullName: null };
  } catch {
    return fail(stage);
  }
}
