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
 *
 * Uses registerExactEvmScheme which registers:
 * - V2: eip155:* wildcard (or specific networks if provided)
 * - V1: All supported EVM networks with ExactEvmSchemeV1
 */
export function createX402Client(options: CreateClientOptions): x402HTTPClient {
	const client = new x402Client();
	registerExactEvmScheme(client, {
		signer: options.signer,
		networks: options.networks,
	});
	return new x402HTTPClient(client);
}
