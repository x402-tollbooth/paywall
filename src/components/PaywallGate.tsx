import type { PaymentRequired, SettleResponse } from "@x402/core/types";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTollbooth } from "../hooks/useTollbooth";
import { explorerUrl, formatAmount } from "../lib/format";
import { buildTxRecord, decodeSettlement } from "../lib/settlement";
import type { TollboothState } from "../lib/types";

export interface PaywallGateProps {
	endpoint: string;
	method?: string;
	body?: BodyInit | Record<string, unknown>;
	headers?: Record<string, string>;
	/** Render prop: receives parsed JSON data on success */
	children: (data: unknown, settlement?: SettleResponse) => ReactNode;
	loadingContent?: ReactNode;
	/** Whether to auto-probe on mount (default: true) */
	autoProbe?: boolean;
	className?: string;
}

function decodePaymentRequired(header: string): PaymentRequired | null {
	try {
		const decoded = JSON.parse(atob(header));
		// Tollbooth gateway sends a raw array — normalize to envelope
		if (Array.isArray(decoded)) {
			return { x402Version: 1, accepts: decoded } as PaymentRequired;
		}
		return decoded;
	} catch {
		return null;
	}
}

export function PaywallGate({
	endpoint,
	method = "GET",
	body,
	headers,
	children,
	loadingContent,
	autoProbe = true,
	className,
}: PaywallGateProps) {
	const { paymentFetch, isReady, recordTx } = useTollbooth();
	const [state, setState] = useState<TollboothState>("idle");
	const [paymentInfo, setPaymentInfo] = useState<PaymentRequired | null>(null);
	const [data, setData] = useState<unknown>(null);
	const [settlement, setSettlement] = useState<SettleResponse | undefined>();
	const [error, setError] = useState<Error | null>(null);

	const buildInit = useCallback((): RequestInit => {
		const isObjectBody =
			body != null &&
			typeof body === "object" &&
			!(body instanceof Blob) &&
			!(body instanceof FormData) &&
			!(body instanceof ArrayBuffer) &&
			!(body instanceof ReadableStream);

		const init: RequestInit = {
			method,
			headers: {
				...(isObjectBody ? { "Content-Type": "application/json" } : {}),
				...headers,
			},
		};
		if (body != null) {
			init.body = isObjectBody ? JSON.stringify(body) : (body as BodyInit);
		}
		return init;
	}, [method, body, headers]);

	// Phase 1: Probe endpoint to check if payment is needed
	const probe = useCallback(async () => {
		setState("loading");
		setError(null);
		try {
			const init = buildInit();
			const res = await fetch(endpoint, init);

			if (res.status === 402) {
				const header =
					res.headers.get("payment-required") ??
					res.headers.get("x-payment-required");
				if (header) {
					const info = decodePaymentRequired(header);
					setPaymentInfo(info);
				}
				setState("payment-required");
				return;
			}

			if (!res.ok) {
				throw new Error(`Request failed with status ${res.status}`);
			}

			// No payment needed — resource is free
			const json = await res.json();
			setData(json);
			setState("success");
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
			setState("error");
		}
	}, [endpoint, buildInit]);

	// Phase 2: Pay and fetch the resource
	const handlePay = useCallback(async () => {
		if (!paymentFetch) return;
		setState("paying");
		setError(null);
		try {
			const init = buildInit();
			const res = await paymentFetch(endpoint, init);
			if (!res.ok) {
				throw new Error(`Request failed with status ${res.status}`);
			}
			const settle = decodeSettlement(res);
			setSettlement(settle);
			const json = await res.json();
			setData(json);
			setState("success");

			const txRecord = buildTxRecord(settle, endpoint);
			if (txRecord) recordTx(txRecord);
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
			setState("error");
		}
	}, [paymentFetch, endpoint, buildInit, recordTx]);

	useEffect(() => {
		if (autoProbe) {
			probe();
		}
	}, [autoProbe, probe]);

	const firstAccept = paymentInfo?.accepts?.[0] as
		| (Record<string, unknown> & { amount?: string; maxAmountRequired?: string; asset?: string })
		| undefined;
	const rawAmount = firstAccept?.amount ?? firstAccept?.maxAmountRequired;

	if (state === "success" && data != null) {
		return (
			<div data-tollbooth="gate" data-state="success" className={className}>
				{children(data, settlement)}
				{settlement?.transaction && (
					<div data-tollbooth="settlement">
						<a
							href={explorerUrl(
								settlement.transaction,
								settlement.network ?? "",
							)}
							target="_blank"
							rel="noopener noreferrer"
						>
							View transaction
						</a>
					</div>
				)}
			</div>
		);
	}

	return (
		<div data-tollbooth="gate" data-state={state} className={className}>
			{state === "loading" &&
				(loadingContent ?? <span data-tollbooth="spinner" />)}

			{state === "idle" && !autoProbe && (
				<div data-tollbooth="gate-prompt">
					<button type="button" data-tollbooth="button" onClick={probe}>
						Load Content
					</button>
				</div>
			)}

			{state === "payment-required" && (
				<div data-tollbooth="gate-prompt">
					{rawAmount && (
						<div data-tollbooth="gate-price">
							{formatAmount(rawAmount, firstAccept?.asset as string | undefined)}
						</div>
					)}
					<div data-tollbooth="gate-description">
						Payment required to access this content
					</div>
					<button
						type="button"
						data-tollbooth="button"
						onClick={handlePay}
						disabled={!isReady}
					>
						{isReady ? "Pay & Unlock" : "Connect Wallet"}
					</button>
				</div>
			)}

			{state === "paying" && (
				<div data-tollbooth="gate-prompt">
					<span data-tollbooth="spinner" />
					<div data-tollbooth="gate-description">Signing payment...</div>
				</div>
			)}

			{state === "error" && (
				<div data-tollbooth="gate-prompt">
					<div data-tollbooth="gate-error">{error?.message}</div>
					<button type="button" data-tollbooth="button" onClick={probe}>
						Retry
					</button>
				</div>
			)}
		</div>
	);
}
