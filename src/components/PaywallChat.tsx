import type { SettleResponse } from "@x402/core/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTollbooth } from "../hooks/useTollbooth";
import { explorerUrl } from "../lib/format";
import { extractDeltaContent, parseSSEStream } from "../lib/streams";
import type { ChatMessage } from "../lib/types";

export interface PaywallChatProps {
	endpoint: string;
	model: string;
	systemPrompt?: string;
	placeholder?: string;
	className?: string;
}

interface ChatEntry extends ChatMessage {
	settlement?: SettleResponse;
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

export function PaywallChat({
	endpoint,
	model,
	systemPrompt,
	placeholder = "Type a message...",
	className,
}: PaywallChatProps) {
	const { paymentFetch, isReady } = useTollbooth();
	const [messages, setMessages] = useState<ChatEntry[]>([]);
	const [input, setInput] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(scrollToBottom, [scrollToBottom]);

	const sendMessage = useCallback(async () => {
		if (!input.trim() || !paymentFetch || isStreaming) return;

		const userMessage: ChatEntry = { role: "user", content: input.trim() };
		const newMessages = [...messages, userMessage];
		setMessages(newMessages);
		setInput("");
		setIsStreaming(true);

		// Build the API messages array
		const apiMessages: ChatMessage[] = [];
		if (systemPrompt) {
			apiMessages.push({ role: "system", content: systemPrompt });
		}
		for (const msg of newMessages) {
			apiMessages.push({ role: msg.role, content: msg.content });
		}

		try {
			const response = await paymentFetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model,
					messages: apiMessages,
					stream: true,
				}),
			});

			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}

			const settlement = decodeSettlement(response);

			// Start with an empty assistant message
			const assistantEntry: ChatEntry = {
				role: "assistant",
				content: "",
				settlement,
			};
			setMessages((prev) => [...prev, assistantEntry]);

			// Stream the response
			if (response.body) {
				for await (const chunk of parseSSEStream(response.body)) {
					const content = extractDeltaContent(chunk);
					if (content) {
						setMessages((prev) => {
							const updated = [...prev];
							const last = updated[updated.length - 1];
							if (last && last.role === "assistant") {
								updated[updated.length - 1] = {
									...last,
									content: last.content + content,
								};
							}
							return updated;
						});
					}
				}
			}
		} catch (err) {
			const errorMsg =
				err instanceof Error ? err.message : "Something went wrong";
			setMessages((prev) => [
				...prev,
				{ role: "assistant", content: `Error: ${errorMsg}` },
			]);
		} finally {
			setIsStreaming(false);
		}
	}, [
		input,
		paymentFetch,
		isStreaming,
		messages,
		endpoint,
		model,
		systemPrompt,
	]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				sendMessage();
			}
		},
		[sendMessage],
	);

	return (
		<div data-tollbooth="chat" className={className}>
			<div data-tollbooth="chat-messages">
				{messages.map((msg, i) => (
					<div
						key={`${msg.content}-${i}`}
						data-tollbooth="chat-message"
						data-role={msg.role}
					>
						{msg.content}
						{msg.settlement?.transaction && (
							<div data-tollbooth="settlement">
								<a
									href={explorerUrl(
										msg.settlement.transaction,
										msg.settlement.network ?? "",
									)}
									target="_blank"
									rel="noopener noreferrer"
								>
									tx
								</a>
							</div>
						)}
					</div>
				))}
				{isStreaming && messages[messages.length - 1]?.content === "" && (
					<div data-tollbooth="chat-message" data-role="assistant">
						<span data-tollbooth="spinner" />
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>
			<div data-tollbooth="chat-input">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={!isReady || isStreaming}
				/>
				<button
					type="submit"
					data-tollbooth="button"
					onClick={sendMessage}
					disabled={!isReady || isStreaming || !input.trim()}
				>
					{isStreaming ? <span data-tollbooth="spinner" /> : "Send"}
				</button>
			</div>
		</div>
	);
}
