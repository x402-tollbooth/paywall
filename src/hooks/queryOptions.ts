import type { SettleResponse } from "@x402/core/types";

type PaymentFetch = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export interface PaywallQueryResult<T = unknown> {
	data: T;
	settlement?: SettleResponse;
}

function extractSettlement(response: Response): SettleResponse | undefined {
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
 * Create TanStack Query queryOptions for a paid GET request.
 *
 * @example
 * ```tsx
 * const { paymentFetch } = useTollbooth();
 * const { data } = useQuery(paywallQueryOptions(paymentFetch, "/api/data"));
 * ```
 */
export function paywallQueryOptions<T = unknown>(
	paymentFetch: PaymentFetch | null,
	endpoint: string,
	init?: RequestInit,
) {
	return {
		queryKey: [
			"tollbooth",
			endpoint,
			init?.method ?? "GET",
			init?.body,
		] as const,
		queryFn: async (): Promise<PaywallQueryResult<T>> => {
			if (!paymentFetch) {
				throw new Error("Wallet not connected");
			}
			const response = await paymentFetch(endpoint, init);
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}
			const settlement = extractSettlement(response);
			const data = (await response.json()) as T;
			return { data, settlement };
		},
		enabled: paymentFetch != null,
	};
}

export interface PaywallMutationVariables {
	body?: unknown;
	headers?: Record<string, string>;
}

/**
 * Create TanStack Query mutationOptions for a paid POST/PUT/etc request.
 *
 * @example
 * ```tsx
 * const { paymentFetch } = useTollbooth();
 * const mutation = useMutation(paywallMutationOptions(paymentFetch, "/api/submit"));
 * mutation.mutate({ body: { message: "hello" } });
 * ```
 */
export function paywallMutationOptions<T = unknown>(
	paymentFetch: PaymentFetch | null,
	endpoint: string,
	method: string = "POST",
) {
	return {
		mutationFn: async (
			variables?: PaywallMutationVariables,
		): Promise<PaywallQueryResult<T>> => {
			if (!paymentFetch) {
				throw new Error("Wallet not connected");
			}
			const response = await paymentFetch(endpoint, {
				method,
				headers: {
					"Content-Type": "application/json",
					...variables?.headers,
				},
				body: variables?.body ? JSON.stringify(variables.body) : undefined,
			});
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}
			const settlement = extractSettlement(response);
			const data = (await response.json()) as T;
			return { data, settlement };
		},
	};
}
