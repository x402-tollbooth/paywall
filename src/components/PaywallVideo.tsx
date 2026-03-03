import type { PaymentRequired, SettleResponse } from "@x402/core/types";
import { useCallback, useRef, useState } from "react";
import { useTollbooth } from "../hooks/useTollbooth";
import { explorerUrl, formatAmount } from "../lib/format";
import type { TollboothState } from "../lib/types";

export interface PaywallVideoProps {
	endpoint: string;
	poster?: string;
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

function decodeSettlement(response: Response): SettleResponse | undefined {
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

export function PaywallVideo({
	endpoint,
	poster,
	className,
}: PaywallVideoProps) {
	const { paymentFetch, isReady } = useTollbooth();
	const [state, setState] = useState<TollboothState>("idle");
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [paymentInfo, setPaymentInfo] = useState<PaymentRequired | null>(null);
	const [settlement, setSettlement] = useState<SettleResponse | undefined>();
	const [error, setError] = useState<Error | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const probe = useCallback(async () => {
		setState("loading");
		setError(null);
		try {
			// Use GET (not HEAD) because x402-tollbooth only defines GET routes.
			// A 402 body is small; if 200, we abort to avoid downloading the video.
			const controller = new AbortController();
			const res = await fetch(endpoint, { signal: controller.signal });
			if (res.status === 402) {
				const header =
					res.headers.get("payment-required") ??
					res.headers.get("x-payment-required");
				if (header) {
					setPaymentInfo(decodePaymentRequired(header));
				}
				setState("payment-required");
				return;
			}
			// No payment needed — play directly (cancel the download, use URL)
			controller.abort();
			setVideoUrl(endpoint);
			setState("success");
		} catch (err) {
			// AbortError from our own abort is expected
			if (err instanceof DOMException && err.name === "AbortError") return;
			setError(err instanceof Error ? err : new Error(String(err)));
			setState("error");
		}
	}, [endpoint]);

	const handlePay = useCallback(async () => {
		if (!paymentFetch) return;
		setState("paying");
		setError(null);
		try {
			const res = await paymentFetch(endpoint);
			if (!res.ok) {
				throw new Error(`Request failed with status ${res.status}`);
			}
			const settle = decodeSettlement(res);
			setSettlement(settle);

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			setVideoUrl(url);
			setState("success");
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
			setState("error");
		}
	}, [paymentFetch, endpoint]);

	// Auto-probe on first render
	if (state === "idle") {
		probe();
	}

	const firstAccept = paymentInfo?.accepts?.[0] as
		| (Record<string, unknown> & { amount?: string; maxAmountRequired?: string; asset?: string })
		| undefined;
	const rawAmount = firstAccept?.amount ?? firstAccept?.maxAmountRequired;
	const price = rawAmount
		? formatAmount(rawAmount, firstAccept?.asset as string | undefined)
		: null;
	const description = paymentInfo?.resource?.description;

	return (
		<div data-tollbooth="video" data-state={state} className={className}>
			{state === "success" && videoUrl ? (
				<video
					ref={videoRef}
					src={videoUrl}
					controls
					autoPlay
					poster={poster}
					data-tollbooth="video-player"
				>
					<track kind="captions" />
				</video>
			) : (
				<>
					{/* Fake player chrome */}
					<div data-tollbooth="video-backdrop">
						{poster ? (
							<img
								src={poster}
								alt="Video thumbnail"
								data-tollbooth="video-poster"
							/>
						) : (
							<div data-tollbooth="video-placeholder" />
						)}
					</div>

					{/* Fake progress bar at bottom */}
					<div data-tollbooth="video-controls">
						<div data-tollbooth="video-controls-bar">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="white" role="img" aria-label="Play">
								<title>Play</title>
								<path d="M8 5v14l11-7z" />
							</svg>
							<div data-tollbooth="video-progress">
								<div data-tollbooth="video-progress-fill" />
							</div>
							<span data-tollbooth="video-time">0:00 / 3:24</span>
						</div>
					</div>

					{/* Lock overlay */}
					<div data-tollbooth="video-overlay">
						{state === "loading" && <span data-tollbooth="spinner" />}

						{state === "payment-required" && (
							<>
								{/* Lock icon */}
								<svg
									data-tollbooth="video-lock"
									width="48"
									height="48"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									role="img"
									aria-label="Locked content"
								>
									<title>Locked content</title>
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>

								{description && (
									<div data-tollbooth="video-description">{description}</div>
								)}
								{price && (
									<div data-tollbooth="video-price">{price} USDC</div>
								)}

								<button
									type="button"
									data-tollbooth="video-unlock"
									onClick={handlePay}
									disabled={!isReady}
								>
									{isReady ? (
										<>
											<svg
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												role="img"
												aria-label="Unlock"
											>
												<title>Unlock</title>
												<rect
													x="3"
													y="11"
													width="18"
													height="11"
													rx="2"
													ry="2"
												/>
												<path d="M7 11V7a5 5 0 0 1 9.9-1" />
											</svg>
											Unlock Video
										</>
									) : (
										"Connect Wallet"
									)}
								</button>
							</>
						)}

						{state === "paying" && (
							<>
								<span
									data-tollbooth="spinner"
									style={{ width: 32, height: 32 }}
								/>
								<div data-tollbooth="video-price">Signing payment...</div>
							</>
						)}

						{state === "error" && (
							<>
								<div style={{ color: "#ff6b6b" }}>{error?.message}</div>
								<button
									type="button"
									data-tollbooth="video-unlock"
									onClick={probe}
								>
									Retry
								</button>
							</>
						)}
					</div>
				</>
			)}
			{settlement?.transaction && (
				<div data-tollbooth="settlement">
					<a
						href={explorerUrl(settlement.transaction, settlement.network ?? "")}
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
