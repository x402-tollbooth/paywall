import { type ReactNode, useCallback } from "react";
import { usePaywall } from "../hooks/usePaywall";
import type { PaymentResult } from "../lib/types";

export interface PaywallButtonProps {
	endpoint: string;
	method?: string;
	body?: BodyInit | Record<string, unknown>;
	headers?: Record<string, string>;
	onSuccess?: (result: PaymentResult) => void;
	onError?: (error: Error) => void;
	children?: ReactNode | ((state: { isPaying: boolean }) => ReactNode);
	className?: string;
	disabled?: boolean;
}

export function PaywallButton({
	endpoint,
	method = "GET",
	body,
	headers,
	onSuccess,
	onError,
	children = "Pay",
	className,
	disabled,
}: PaywallButtonProps) {
	const { pay, isPaying, state } = usePaywall();

	const handleClick = useCallback(async () => {
		try {
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

			const result = await pay(endpoint, init);
			onSuccess?.(result);
		} catch (err) {
			onError?.(err instanceof Error ? err : new Error(String(err)));
		}
	}, [pay, endpoint, method, body, headers, onSuccess, onError]);

	const content =
		typeof children === "function" ? children({ isPaying }) : children;

	return (
		<button
			type="button"
			data-tollbooth="button"
			data-state={state}
			onClick={handleClick}
			disabled={disabled || isPaying}
			className={className}
		>
			{isPaying ? <span data-tollbooth="spinner" /> : null}
			{content}
		</button>
	);
}
