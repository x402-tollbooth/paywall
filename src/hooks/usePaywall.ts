import { useCallback, useRef, useState } from "react";
import { buildTxRecord, decodeSettlement } from "../lib/settlement";
import type { PaymentResult, TollboothState } from "../lib/types";
import { useTollbooth } from "./useTollbooth";

export interface UsePaywallReturn {
	/** Execute a paid request */
	pay: (endpoint: string, init?: RequestInit) => Promise<PaymentResult>;
	/** Current state */
	state: TollboothState;
	/** Last successful payment result */
	lastPayment: PaymentResult | null;
	/** Last error */
	error: Error | null;
	/** Whether a request is in-flight */
	isPaying: boolean;
	/** Reset state to idle */
	reset: () => void;
}

export function usePaywall(): UsePaywallReturn {
	const { paymentFetch, isReady, recordTx } = useTollbooth();
	const [state, setState] = useState<TollboothState>("idle");
	const [lastPayment, setLastPayment] = useState<PaymentResult | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const pay = useCallback(
		async (endpoint: string, init?: RequestInit): Promise<PaymentResult> => {
			if (!paymentFetch || !isReady) {
				throw new Error(
					"Wallet not connected. Wrap your app in <TollboothProvider> and connect a wallet.",
				);
			}

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setState("paying");
			setError(null);

			try {
				const response = await paymentFetch(endpoint, {
					...init,
					signal: controller.signal,
				});

				const settlement = decodeSettlement(response);

				if (!response.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}

				const result: PaymentResult = { response, settlement };
				setLastPayment(result);
				setState("success");

				const txRecord = buildTxRecord(settlement, endpoint);
				if (txRecord) recordTx(txRecord);

				return result;
			} catch (err) {
				const e = err instanceof Error ? err : new Error(String(err));
				setError(e);
				setState("error");
				throw e;
			}
		},
		[paymentFetch, isReady, recordTx],
	);

	const reset = useCallback(() => {
		abortRef.current?.abort();
		setState("idle");
		setError(null);
		setLastPayment(null);
	}, []);

	return {
		pay,
		state,
		lastPayment,
		error,
		isPaying: state === "paying",
		reset,
	};
}
