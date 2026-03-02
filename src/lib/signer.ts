/** biome-ignore-all lint/suspicious/noExplicitAny: evm message types are complex and we don't want to type them ourselves right now */
import type { ClientEvmSigner } from "@x402/evm";
import { toClientEvmSigner } from "@x402/evm";
import type { PublicClient, WalletClient } from "viem";

/**
 * Adapt a wagmi WalletClient + PublicClient into x402's ClientEvmSigner.
 *
 * wagmi's useWalletClient() returns a viem WalletClient.
 * wagmi's usePublicClient() returns a viem PublicClient.
 */
export function walletClientToSigner(
	walletClient: WalletClient,
	publicClient: PublicClient,
): ClientEvmSigner {
	if (!walletClient.account) {
		throw new Error("Wallet client has no account connected");
	}

	return toClientEvmSigner(
		{
			address: walletClient.account.address,
			signTypedData: (msg) =>
				walletClient.signTypedData({
					// biome-ignore lint/style/noNonNullAssertion: we check for account above
					account: walletClient.account!,
					domain: msg.domain as any,
					types: msg.types as any,
					primaryType: msg.primaryType as any,
					message: msg.message as any,
				}),
		},
		{
			readContract: (args) => publicClient.readContract(args as any),
			getTransactionCount: (args) =>
				publicClient.getTransactionCount({ address: args.address }),
			estimateFeesPerGas: () => publicClient.estimateFeesPerGas(),
		},
	);
}
