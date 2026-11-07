import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

globalThis.__atlasTestEnv = { ATLAS_AUTH_MODE: 'public' };
globalThis.__atlasHeaderReads = 0;
registerHooks({
  resolve(specifier, context, next) {
    const mocks = {
      'cloudflare:workers': 'export const env = globalThis.__atlasTestEnv;',
      'next/headers': `export async function headers() { globalThis.__atlasHeaderReads++; return new Headers({'oai-authenticated-user-id':'forged-owner','oai-authenticated-user-email':'forged@example.com'}); }`,
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
