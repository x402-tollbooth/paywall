import type { x402HTTPClient } from "@x402/core/client";
import type { Network } from "@x402/core/types";
import { createContext, type ReactNode, useMemo } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { walletClientToSigner } from "./lib/signer";
import { createPaymentFetch, createX402Client } from "./lib/x402";

export interface TollboothContextValue {
	/** Payment-enabled fetch. null when wallet not connected. */
	paymentFetch:
		| ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
		| null;
	/** The underlying x402HTTPClient. null when wallet not connected. */
	httpClient: x402HTTPClient | null;
	/** Whether a wallet is connected and the client is ready */
	isReady: boolean;
	/** Connected wallet address, if any */
	address: `0x${string}` | undefined;
}

export const TollboothContext = createContext<TollboothContextValue>({
	paymentFetch: null,
	httpClient: null,
	isReady: false,
	address: undefined,
});

export interface TollboothProviderProps {
	children: ReactNode;
	/** Optional network filter (CAIP-2 strings). If omitted, supports all EVM chains. */
	networks?: Network[];
}

export function TollboothProvider({
	children,
	networks,
}: TollboothProviderProps) {
	const { data: walletClient } = useWalletClient();
	const publicClient = usePublicClient();

	const value = useMemo<TollboothContextValue>(() => {
		if (!walletClient?.account || !publicClient) {
			return {
				paymentFetch: null,
				httpClient: null,
				isReady: false,
				address: undefined,
			};
		}

		const signer = walletClientToSigner(walletClient, publicClient);
		const { client, httpClient } = createX402Client({ signer, networks });
		const paymentFetch = createPaymentFetch(fetch, client, httpClient);

		return {
			paymentFetch,
			httpClient,
			isReady: true,
			address: walletClient.account.address,
		};
	}, [walletClient, publicClient, networks]);

	return (
		<TollboothContext.Provider value={value}>
			{children}
		</TollboothContext.Provider>
	);
}
