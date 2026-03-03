import type { SettleResponse } from "@x402/core/types";
import type { TxRecord } from "./types";

/**
 * Decode settlement info from a paid response's headers.
 */
export function decodeSettlement(response: Response): SettleResponse | undefined {
	const header =
		response.headers.get("payment-response") ??
		response.headers.get("x-payment-response");
	if (!header) return undefined;
	try {
		return JSON.parse(atob(header));
	} catch {
		return undefined;
	}
}

/**
 * Build a TxRecord from a settlement response + request context.
 * Returns null if the settlement has no transaction hash.
 */
export function buildTxRecord(
	settlement: SettleResponse | undefined,
	endpoint: string,
): TxRecord | null {
	if (!settlement?.transaction) return null;

	// biome-ignore lint/suspicious/noExplicitAny: settlement types vary across v1/v2
	const s = settlement as any;

	return {
		txHash: settlement.transaction,
		network: settlement.network ?? "",
		endpoint,
		timestamp: new Date().toISOString(),
		amount: s.payer?.amount ?? s.amount,
		asset: s.payer?.asset ?? s.asset,
	};
}
