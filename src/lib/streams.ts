/**
 * Parse an SSE (text/event-stream) response body into an async iterator of data strings.
 * Handles the OpenAI-compatible streaming format:
 *   data: {"choices":[{"delta":{"content":"Hello"}}]}
 *   data: [DONE]
 */
export async function* parseSSEStream(
	body: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, undefined> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed === "") continue;
				if (trimmed === "data: [DONE]") return;
				if (trimmed.startsWith("data: ")) {
					yield trimmed.slice(6);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Extract content text from an OpenAI-compatible SSE chunk JSON string.
 */
export function extractDeltaContent(jsonStr: string): string | null {
	try {
		const parsed = JSON.parse(jsonStr);
		// OpenAI format
		const openaiContent = parsed.choices?.[0]?.delta?.content;
		if (openaiContent != null) return openaiContent;
		// Anthropic streaming format
		if (parsed.type === "content_block_delta") {
			return parsed.delta?.text ?? null;
		}
		return null;
	} catch {
		return null;
	}
}
