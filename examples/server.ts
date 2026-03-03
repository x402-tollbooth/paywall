import type { TollboothConfig } from "x402-tollbooth";
import { createGateway } from "x402-tollbooth";
import index from "./index.html";
import { startUpstream } from "./upstream";

const PORT = Number(process.env.PORT ?? 3000);
const TOLLBOOTH_PORT = PORT + 1;
const UPSTREAM_PORT = PORT + 2;

const PAY_TO =
	process.env.PAY_TO ?? "0x209693Bc6afc0C5328bA36FaF03C514EF312287C";

// ── 1. Start upstream content API ──────────────────────
startUpstream(UPSTREAM_PORT);

// ── 2. Start real x402-tollbooth gateway ───────────────
const tollboothConfig: TollboothConfig = {
	gateway: {
		port: TOLLBOOTH_PORT,
		discovery: true,
	},
	wallets: {
		"base-sepolia": PAY_TO,
	},
	accepts: [{ asset: "USDC", network: "base-sepolia" }],
	defaults: {
		price: "$0.001",
		timeout: 300,
	},
	upstreams: {
		demo: {
			url: `http://localhost:${UPSTREAM_PORT}`,
		},
	},
	routes: {
		"GET /data": {
			upstream: "demo",
			path: "/data",
			price: "$0.001",
		},
		"GET /article": {
			upstream: "demo",
			path: "/article",
			price: "$0.005",
		},
		"GET /video": {
			upstream: "demo",
			path: "/video",
			price: "$0.025",
		},
	},
};

const gateway = createGateway(tollboothConfig);
await gateway.start({ silent: true });

// ── 3. Frontend server + proxy to tollbooth ────────────
const server = Bun.serve({
	port: PORT,
	routes: {
		"/": index,
	},
	async fetch(req) {
		const url = new URL(req.url);

		// CORS preflight
		if (req.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods":
						"GET, POST, PUT, DELETE, OPTIONS, HEAD",
					"Access-Control-Allow-Headers":
						"Content-Type, payment-signature, x-payment-signature",
					"Access-Control-Expose-Headers":
						"payment-required, payment-response, x-payment-required, x-payment-response",
				},
			});
		}

		// Proxy /api/* → tollbooth gateway (strips /api prefix)
		if (url.pathname.startsWith("/api/")) {
			const gatewayPath = url.pathname.replace(/^\/api/, "");
			const gatewayUrl = `http://localhost:${TOLLBOOTH_PORT}${gatewayPath}${url.search}`;

			const headers = new Headers(req.headers);
			headers.set("host", `localhost:${TOLLBOOTH_PORT}`);

			const proxyRes = await fetch(gatewayUrl, {
				method: req.method,
				headers,
				body: req.body,
				redirect: "manual",
			});

			// Copy response with CORS headers
			const resHeaders = new Headers(proxyRes.headers);
			resHeaders.set("Access-Control-Allow-Origin", "*");
			resHeaders.set(
				"Access-Control-Expose-Headers",
				"payment-required, payment-response, x-payment-required, x-payment-response",
			);

			return new Response(proxyRes.body, {
				status: proxyRes.status,
				statusText: proxyRes.statusText,
				headers: resHeaders,
			});
		}

		return undefined as unknown as Response;
	},
	development: {
		hmr: true,
		console: true,
	},
});

console.log("");
console.log("  @tollbooth/paywall demo");
console.log("  ──────────────────────────────────────");
console.log(`  Frontend:  http://localhost:${server.port}`);
console.log(`  Gateway:   http://localhost:${TOLLBOOTH_PORT} (x402-tollbooth)`);
console.log(`  Upstream:  http://localhost:${UPSTREAM_PORT}`);
console.log(`  Pay to:    ${PAY_TO}`);
console.log("  Network:   Base Sepolia (testnet)");
console.log("");
console.log("  Routes (via /api proxy):");
console.log("    GET  /api/data    → $0.001 USDC");
console.log("    GET  /api/article → $0.005 USDC");
console.log("    GET  /api/video   → $0.025 USDC");
console.log("");
console.log("  Get testnet USDC: https://faucet.circle.com");
console.log("");
