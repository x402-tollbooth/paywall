export type {
	Network,
	PaymentPayload,
	PaymentRequired,
	PaymentRequirements,
	SettleResponse,
} from "@x402/core/types";

export type { ClientEvmSigner } from "@x402/evm";

export type TollboothState =
	| "idle"
	| "loading"
	| "payment-required"
	| "paying"
	| "success"
	| "error";

export interface PaymentResult {
	response: Response;
	settlement?: import("@x402/core/types").SettleResponse;
}

export interface PaymentInfo {
	amount: string;
	asset: string;
	network: string;
	description?: string;
}

export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface TxRecord {
	/** Transaction hash */
	txHash: string;
	/** Network (CAIP-2 or human-readable) */
	network: string;
	/** Endpoint that was paid for */
	endpoint: string;
	/** ISO timestamp */
	timestamp: string;
	/** Amount paid (raw smallest unit) */
	amount?: string;
	/** Asset symbol or address */
	asset?: string;
}
