/**
 * Upstream content API — raw endpoints with no payment logic.
 * The tollbooth gateway sits in front and handles x402 payments.
 */

const SAMPLE_VIDEO_URL =
	"https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export function startUpstream(port: number) {
	return Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);

			if (url.pathname === "/data") {
				return Response.json({
					message: "Here is your premium data!",
					timestamp: new Date().toISOString(),
					prices: { BTC: 97432.51, ETH: 3891.2, SOL: 189.45 },
				});
			}

			if (url.pathname === "/article") {
				return Response.json({
					title: "Understanding x402 Payment Protocol",
					author: "Tollbooth Team",
					content:
						"The x402 protocol repurposes the HTTP 402 status code for machine-to-machine micropayments. It enables APIs to charge callers per-request using blockchain-based USDC transfers, with no API keys or subscriptions needed.",
				});
			}

			if (url.pathname === "/video") {
				// Proxy a real sample video so the <video> player works properly
				const videoRes = await fetch(SAMPLE_VIDEO_URL);
				return new Response(videoRes.body, {
					headers: {
						"Content-Type":
							videoRes.headers.get("Content-Type") ?? "video/mp4",
						"Content-Length": videoRes.headers.get("Content-Length") ?? "",
					},
				});
			}

			return Response.json({ error: "not found" }, { status: 404 });
		},
	});
}
