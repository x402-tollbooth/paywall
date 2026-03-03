import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { Network } from "@x402/core/types";
import type { ClientEvmSigner } from "@x402/evm";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

export interface CreateClientOptions {
	signer: ClientEvmSigner;
	networks?: Network[];
}

/**
 * Create a configured x402HTTPClient for making paid requests.
 */
export function createX402Client(
	options: CreateClientOptions,
): { client: x402Client; httpClient: x402HTTPClient } {
	const client = new x402Client();
	registerExactEvmScheme(client, {
		signer: options.signer,
		networks: options.networks,
	});
	const httpClient = new x402HTTPClient(client);
	return { client, httpClient };
}

/**
 * Normalize a payment-required header from the x402-tollbooth gateway.
 *
 * The tollbooth gateway sends a base64-encoded JSON array (v1 wire format):
 *   [{ scheme, network: "base-sepolia", maxAmountRequired, ... }]
 *
 * @x402/core v1 expects:
 *   { x402Version: 1, accepts: [...] }
 *
 * We use v1 because the gateway also sends v1 requirements to the facilitator,
 * so the payment payload must match (same format, same field names).
 * We then override the header name from "X-PAYMENT" → "payment-signature"
 * since that's what the gateway checks for.
 */
// biome-ignore lint/suspicious/noExplicitAny: payment header types are loosely typed across v1/v2
function normalizePaymentRequired(decoded: any): any {
	// Already a proper envelope with x402Version — pass through
	if (decoded && typeof decoded === "object" && "x402Version" in decoded) {
		return decoded;
	}

	// Raw array from tollbooth gateway → wrap as v1
	if (Array.isArray(decoded)) {
		return {
			x402Version: 1,
			accepts: decoded,
		};
	}

	return decoded;
}

/**
 * Encode a payment payload as base64.
 */
function encodePayload(payload: unknown): string {
	return btoa(JSON.stringify(payload));
}

/**
 * Create a payment-enabled fetch that works with x402-tollbooth gateways.
 *
 * Key differences from @x402/fetch's wrapFetchWithPayment:
 * 1. Normalizes the tollbooth gateway's raw array header → v1 envelope
 * 2. Forces the header to "payment-signature" (the gateway checks this name,
 *    but @x402/core v1 sends "X-PAYMENT" which the gateway ignores)
 */
export function createPaymentFetch(
	fetchFn: typeof fetch,
	client: x402Client,
	_httpClient: x402HTTPClient,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
	return async (input, init) => {
		const request = new Request(input, init);
		const clonedRequest = request.clone();
		const response = await fetchFn(request);

		if (response.status !== 402) {
			return response;
		}

		// Decode payment-required header
		const header =
			response.headers.get("payment-required") ??
			response.headers.get("x-payment-required");
		if (!header) {
			throw new Error("402 response has no payment-required header");
		}

		let decoded: unknown;
		try {
			decoded = JSON.parse(atob(header));
		} catch {
			throw new Error("Failed to decode payment-required header");
		}

		// Normalize tollbooth's raw array → v1 envelope
		const paymentRequired = normalizePaymentRequired(decoded);

		// Create and sign the payment payload (v1 scheme)
		const paymentPayload =
			await client.createPaymentPayload(paymentRequired);

		// Always use "payment-signature" header — this is what the tollbooth
		// gateway checks. The @x402/core v1 client would send "X-PAYMENT"
		// which the gateway ignores.
		clonedRequest.headers.set(
			"payment-signature",
			encodePayload(paymentPayload),
		);

		return fetchFn(clonedRequest);
	};
}
