const USDC_DECIMALS = 6;

/**
 * Parse a human-readable price string to the smallest unit as bigint.
 * e.g. "$0.01" → 10000n (0.01 * 10^6 for USDC)
 *
 * Supports:
 *   "$0.01"   → dollar amount
 *   "0.01"    → dollar amount without prefix
 *   "10000"   → raw smallest unit (no decimal point)
 */
export function parsePrice(price: string, asset?: string): bigint {
	const decimals = asset
		? (KNOWN_DECIMALS[asset.toLowerCase()] ?? USDC_DECIMALS)
		: USDC_DECIMALS;
	const cleaned = price.replace(/^\$/, "").trim();

	if (!cleaned.includes(".")) {
		return BigInt(cleaned);
	}

	const [whole = "0", frac = ""] = cleaned.split(".");
	const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
	return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFrac);
}

/**
 * Format a smallest-unit bigint back to human-readable dollar string.
 * e.g. 10000n → "$0.010000"
 */
export function formatPrice(amount: bigint, asset?: string): string {
	const decimals = asset
		? (KNOWN_DECIMALS[asset.toLowerCase()] ?? USDC_DECIMALS)
		: USDC_DECIMALS;
	const divisor = BigInt(10 ** decimals);
	const whole = amount / divisor;
	const fractional = amount % divisor;
	const fracStr = fractional.toString().padStart(decimals, "0");
	return `$${whole}.${fracStr}`;
}

const KNOWN_DECIMALS: Record<string, number> = {
	"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": 6, // USDC Base
	"0x036cbd53842c5426634e7929541ec2318f3dcf7e": 6, // USDC Base Sepolia
	"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6, // USDC Ethereum
	"0xaf88d065e77c8cc2239327c5edb3a432268e5831": 6, // USDC Arbitrum
};

/**
 * Format a raw amount string to a human-readable dollar string.
 * Falls back to 6 decimals (USDC) when asset is unknown.
 */
export function formatAmount(amount: string, asset?: string): string {
	const decimals = asset ? (KNOWN_DECIMALS[asset.toLowerCase()] ?? 6) : 6;
	const raw = BigInt(amount);
	const divisor = BigInt(10 ** decimals);
	const whole = raw / divisor;
	const fractional = raw % divisor;
	const fracStr = fractional.toString().padStart(decimals, "0");
	const trimmed = fracStr.replace(/0+$/, "").padEnd(2, "0");
	return `$${whole}.${trimmed}`;
}

/**
 * Shorten an Ethereum address for display: 0x1234...abcd
 */
export function shortenAddress(address: string): string {
	if (address.length < 10) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Build a block explorer URL for a transaction hash.
 */
export function explorerUrl(txHash: string, network: string): string {
	const explorers: Record<string, string> = {
		"eip155:8453": "https://basescan.org/tx/",
		"eip155:84532": "https://sepolia.basescan.org/tx/",
		"eip155:1": "https://etherscan.io/tx/",
		"eip155:42161": "https://arbiscan.io/tx/",
	};
	const base = explorers[network] ?? "https://basescan.org/tx/";
	return `${base}${txHash}`;
}
