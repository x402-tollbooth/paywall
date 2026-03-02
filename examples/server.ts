import index from "./index.html";

/**
 * Build a 402 response with x402 V2 payment-required header.
 * This mimics what a real x402-tollbooth gateway returns.
 */
function paymentRequired(
	resourceUrl: string,
	description: string,
	amount: string,
	mimeType = "application/json",
): Response {
	const paymentRequirements = {
		x402Version: 2,
		resource: { url: resourceUrl, description, mimeType },
		accepts: [
			{
				scheme: "exact",
				network: "eip155:84532",
				amount,
				asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
				payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
				maxTimeoutSeconds: 300,
				extra: {
					assetTransferMethod: "eip3009",
					name: "USDC",
					version: "2",
				},
			},
		],
	};

	const encoded = btoa(JSON.stringify(paymentRequirements));

	return new Response(JSON.stringify({ error: "Payment Required" }), {
		status: 402,
		headers: {
			"Content-Type": "application/json",
			"payment-required": encoded,
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Expose-Headers": "payment-required, payment-response",
		},
	});
}

/**
 * Check if a request includes a payment-signature header.
 * In a real setup, x402-tollbooth verifies this via the facilitator.
 * Here we just check it exists to simulate the flow.
 */
function hasPaid(req: Request): boolean {
	return (
		req.headers.has("payment-signature") ||
		req.headers.has("x-payment-signature")
	);
}

/** Fake settlement response header (mimics facilitator response) */
function settlementHeader(): string {
	return btoa(
		JSON.stringify({
			success: true,
			transaction: `0x${"ab".repeat(32)}`,
			network: "eip155:84532",
			payer: "0x0000000000000000000000000000000000000000",
		}),
	);
}

/**
 * Generate a tiny valid MP4 (1-second black 160x120 video).
 * This is a pre-encoded minimal mp4 so we don't need ffmpeg.
 */
function generateTinyMp4(): Uint8Array {
	// Minimal valid MP4 with ftyp + moov boxes (no actual video frames).
	// Browsers will load it and show a black frame — enough for a demo.
	const hex =
		"0000001c667479706973" +
		"6f6d0000020069736f6d" +
		"69736f326d703431" +
		"00000008" + // free box (8 bytes)
		"66726565" +
		"000001b1" + // moov box
		"6d6f6f76" +
		"0000006c" + // mvhd box (108 bytes)
		"6d766864" +
		"00000000" + // version + flags
		"00000000" + // creation time
		"00000000" + // modification time
		"000003e8" + // timescale (1000)
		"000003e8" + // duration (1000 = 1 sec)
		"00010000" + // preferred rate
		"01000000" + // preferred volume
		"0000000000000000" + // reserved
		"0000000000010000" + // matrix
		"0000000000000000" +
		"0000000000010000" +
		"0000000000000000" +
		"0000000040000000" +
		"0000000000000000" +
		"0000000000000000" +
		"0000000000000000" +
		"0000000000000000" +
		"0000000000000000" +
		"00000002" + // next track id
		"0000013d" + // trak box
		"7472616b" +
		"0000005c" + // tkhd box (92 bytes)
		"746b6864" +
		"00000003" + // version + flags (track enabled)
		"00000000" + // creation time
		"00000000" + // modification time
		"00000001" + // track id
		"00000000" + // reserved
		"000003e8" + // duration (1000)
		"0000000000000000" + // reserved
		"00000000" + // layer + alt group
		"00000000" + // volume + reserved
		"00010000" + // matrix
		"0000000000000000" +
		"0000000000010000" +
		"0000000000000000" +
		"0000000040000000" +
		"00a00000" + // width (160 in 16.16 fixed)
		"00780000" + // height (120 in 16.16 fixed)
		"000000d9" + // mdia box
		"6d646961" +
		"00000020" + // mdhd box (32 bytes)
		"6d646864" +
		"00000000" +
		"00000000" +
		"00000000" +
		"000003e8" + // timescale
		"000003e8" + // duration
		"55c40000" + // language + pad
		"00000021" + // hdlr box (33 bytes)
		"68646c72" +
		"00000000" +
		"00000000" +
		"76696465" + // handler type: vide
		"000000000000000000000000" +
		"00" + // name (null)
		"00000090" + // minf box
		"6d696e66" +
		"00000014" + // vmhd box (20 bytes)
		"766d6864" +
		"00000001" + // version + flags
		"0000000000000000" + // graphicsmode + opcolor
		"00000024" + // dinf box (36 bytes)
		"64696e66" +
		"0000001c" + // dref box (28 bytes)
		"64726566" +
		"00000000" +
		"00000001" + // entry count
		"0000000c" + // url entry (12 bytes)
		"75726c20" +
		"00000001" + // self-contained flag
		"00000050" + // stbl box
		"7374626c" +
		"00000010" + // stsd box (minimal, 16 bytes — no entries)
		"73747364" +
		"00000000" +
		"00000000" +
		"00000010" + // stts
		"73747473" +
		"00000000" +
		"00000000" +
		"00000010" + // stsc
		"73747363" +
		"00000000" +
		"00000000" +
		"00000014" + // stsz
		"7374737a" +
		"00000000" +
		"00000000" +
		"00000000" +
		"00000010" + // stco
		"7374636f" +
		"00000000" +
		"00000000";

	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
	"Access-Control-Allow-Headers":
		"Content-Type, payment-signature, x-payment-signature",
	"Access-Control-Expose-Headers":
		"payment-required, payment-response, x-payment-required, x-payment-response",
};

const server = Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	routes: {
		"/": index,
	},
	fetch(req) {
		const url = new URL(req.url);

		// CORS preflight
		if (req.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		// Mock paid endpoint: GET /api/data
		if (url.pathname === "/api/data") {
			if (!hasPaid(req)) {
				return paymentRequired(
					`${url.origin}/api/data`,
					"Premium market data",
					"1000", // $0.001 USDC
				);
			}
			return Response.json(
				{
					message: "Here is your premium data!",
					timestamp: new Date().toISOString(),
					prices: { BTC: 97432.51, ETH: 3891.2, SOL: 189.45 },
				},
				{
					headers: {
						...CORS_HEADERS,
						"payment-response": settlementHeader(),
					},
				},
			);
		}

		// Mock paid endpoint: GET /api/article
		if (url.pathname === "/api/article") {
			if (!hasPaid(req)) {
				return paymentRequired(
					`${url.origin}/api/article`,
					"Premium article",
					"5000", // $0.005 USDC
				);
			}
			return Response.json(
				{
					title: "Understanding x402 Payment Protocol",
					author: "Tollbooth Team",
					content:
						"The x402 protocol repurposes the HTTP 402 status code for machine-to-machine micropayments. It enables APIs to charge callers per-request using blockchain-based USDC transfers, with no API keys or subscriptions needed.",
				},
				{
					headers: {
						...CORS_HEADERS,
						"payment-response": settlementHeader(),
					},
				},
			);
		}

		// Mock paid endpoint: GET|HEAD /api/video
		if (url.pathname === "/api/video") {
			if (req.method === "HEAD" || !hasPaid(req)) {
				return paymentRequired(
					`${url.origin}/api/video`,
					"Premium video content",
					"25000", // $0.025 USDC
					"video/mp4",
				);
			}

			// Generate a tiny valid MP4 file (ftyp + moov atoms)
			// This is the smallest valid MP4 — just enough for <video> to accept it
			const mp4 = generateTinyMp4();

			return new Response(mp4, {
				headers: {
					"Content-Type": "video/mp4",
					"Content-Length": mp4.byteLength.toString(),
					...CORS_HEADERS,
					"payment-response": settlementHeader(),
				},
			});
		}

		return undefined as unknown as Response;
	},
	development: {
		hmr: true,
		console: true,
	},
});

console.log(`Demo running at http://localhost:${server.port}`);
console.log("Mock x402 endpoints:");
console.log("  GET  /api/data    — $0.001 (premium data)");
console.log("  GET  /api/article — $0.005 (premium article)");
console.log("  GET  /api/video   — $0.025 (premium video)");
