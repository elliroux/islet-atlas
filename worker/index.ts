import { verifyAccessToken } from "../app/access-auth";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

import { refreshNews } from "../research/news-import";

const worker = {
  async scheduled(_controller: ScheduledController, env: Cloudflare.Env) {
    if (!env.DB) throw new Error("News database unavailable");
    await refreshNews(env.DB);
  },
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url);
    if (env.ATLAS_AUTH_MODE === "access" && url.hostname === "isletatlas.org" &&
        request.method === "GET" && url.pathname === "/atlas-sign-in") {
      const token = request.headers.get("Cf-Access-Jwt-Assertion") ??
        request.headers.get("cookie")?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
      let reason = "missing-token";
      if (!token || !await verifyAccessToken(token, code => { reason = code; })) {
        return new Response(token ? "Atlas rejected the Cloudflare sign-in token (" + reason + ")." : "Cloudflare did not forward a sign-in token.", {
          status: 401, headers: { "Cache-Control": "no-store" },
        });
      }
      return new Response(null, { status: 303, headers: {
        Location: "/", "Cache-Control": "no-store",
        "Set-Cookie": "__Host-atlas-session=" + token + "; Path=/; Secure; HttpOnly; SameSite=Lax",
      } });
    }
    if (env.ATLAS_AUTH_MODE === "access" && url.hostname === "isletatlas.org" &&
        request.method === "GET" && url.pathname === "/atlas-sign-out") {
      return new Response(null, { status: 303, headers: {
        Location: "/cdn-cgi/access/logout", "Cache-Control": "no-store",
        "Set-Cookie": "__Host-atlas-session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0",
      } });
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
