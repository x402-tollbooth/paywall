import { useTollbooth } from "../hooks/useTollbooth";
import { explorerUrl, formatAmount, shortenAddress } from "../lib/format";

export interface TxHistoryProps {
	className?: string;
}

export function TxHistory({ className }: TxHistoryProps) {
	const { transactions } = useTollbooth();

	if (transactions.length === 0) return null;

	return (
		<div data-tollbooth="tx-history" className={className}>
			<div data-tollbooth="tx-history-header">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					role="img"
					aria-label="Transaction history"
				>
					<title>Transaction history</title>
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
				Transactions
				<span data-tollbooth="tx-history-count">{transactions.length}</span>
			</div>
			<div data-tollbooth="tx-history-list">
				{transactions.map((tx) => {
					const time = new Date(tx.timestamp);
					const timeStr = time.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
					});
					const amount = tx.amount
						? formatAmount(tx.amount, tx.asset)
						: null;
					const path = tx.endpoint.replace(/^https?:\/\/[^/]+/, "");

					return (
						<a
							key={tx.txHash}
							data-tollbooth="tx-history-item"
							href={explorerUrl(tx.txHash, tx.network)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<div data-tollbooth="tx-history-item-main">
								<span data-tollbooth="tx-history-item-path">{path}</span>
								{amount && (
									<span data-tollbooth="tx-history-item-amount">
										{amount}
									</span>
								)}
							</div>
							<div data-tollbooth="tx-history-item-meta">
								<span>{shortenAddress(tx.txHash)}</span>
								<span>{timeStr}</span>
							</div>
						</a>
					);
				})}
			</div>
		</div>
	);
}
