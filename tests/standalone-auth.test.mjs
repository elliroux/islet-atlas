import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

globalThis.__atlasTestEnv = { ATLAS_AUTH_MODE: 'public' };
globalThis.__atlasHeaderReads = 0;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "./access-auth" || specifier === "./chatgpt-auth") return next(specifier + ".ts", context);
    const mocks = {
      'cloudflare:workers': 'export const env = globalThis.__atlasTestEnv;',
      'next/headers': `export async function headers() { globalThis.__atlasHeaderReads++; return globalThis.__atlasRequestHeaders ?? new Headers({'oai-authenticated-user-id':'forged-owner','oai-authenticated-user-email':'forged@example.com'}); }`,
      'next/navigation': 'export function redirect() { throw new Error("unexpected redirect"); }',
    };
    return specifier in mocks ? {url:'data:text/javascript,'+encodeURIComponent(mocks[specifier]),shortCircuit:true} : next(specifier,context);
  },
});
const { getChatGPTUser } = await import('../app/chatgpt-auth.ts');
test('standalone hosting rejects supplied identity headers without reading them', async () => {
  assert.equal(await getChatGPTUser(), null);
  assert.equal(globalThis.__atlasHeaderReads, 0);
});
test('existing trusted-gateway hosting retains its identity path', async () => {
  delete globalThis.__atlasTestEnv.ATLAS_AUTH_MODE;
  assert.equal((await getChatGPTUser()).userId, 'forged-owner');
  assert.equal(globalThis.__atlasHeaderReads, 1);
});

test("Access requires a valid signed application token for the configured audience", async t => {
  const { hostedModelKey } = await import("../app/hosted-model.ts");
  const issuer = "https://test.cloudflareaccess.com";
  Object.assign(globalThis.__atlasTestEnv, {
    ATLAS_AUTH_MODE: "access",
    ATLAS_ACCESS_ISSUER: issuer,
    ATLAS_ACCESS_AUDIENCE: "atlas",
    ATLAS_ACCESS_AI_OWNER_EMAIL: "owner@example.com",
    OPENAI_API_KEY: "test-secret",
  });
  assert.equal(await getChatGPTUser(), null);

  const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256",
    modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) };
  const keys = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, issuer + "/cdn-cgi/access/certs");
    assert.equal(options.redirect, "manual");
    return Response.json({ keys: [{ ...jwk, kid: "test-key" }] });
  });
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const claims = { iss: issuer, aud: ["atlas"], type: "app",
    exp: Date.now() / 1000 + 60, sub: "owner", email: "owner@example.com" };
  const header = encode({ alg: "RS256", kid: "test-key" });
  const input = header + "." + encode(claims);
  const signature = Buffer.from(await crypto.subtle.sign(algorithm, keys.privateKey,
    new TextEncoder().encode(input))).toString("base64url");

  const setToken = token => {
    globalThis.__atlasRequestHeaders = new Headers({ cookie: "__Host-atlas-session=" + token });
  };
  setToken(input + "." + signature);
  assert.equal((await getChatGPTUser()).userId, "access:owner");
  assert.equal(await hostedModelKey(), "test-secret");
  globalThis.__atlasTestEnv.ATLAS_ACCESS_AI_OWNER_EMAIL = "another-owner@example.com";
  assert.equal(await hostedModelKey(), undefined);

  setToken(header + "." + encode({ ...claims, email: "forged@example.com" }) + "." + signature);
  assert.equal(await getChatGPTUser(), null);

  setToken(input + "." + signature);
  globalThis.__atlasTestEnv.ATLAS_ACCESS_AUDIENCE = "other-app";
  assert.equal(await getChatGPTUser(), null);
});
