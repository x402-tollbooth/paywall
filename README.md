# @tollbooth/paywall

Drop-in React components for [x402](https://x402.org) micropayments. Connect a wallet, pay USDC, access content — no backend required.

## Install

```sh
npm install @tollbooth/paywall
# peer deps
npm install react react-dom wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

## Setup

Wrap your app with `TollboothProvider` inside your wagmi/RainbowKit providers:

```tsx
import { TollboothProvider } from "@tollbooth/paywall";
import "@tollbooth/paywall/styles";

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <TollboothProvider>
            {/* your app */}
          </TollboothProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

## Components

### `PaywallButton`

A button that triggers a payment when clicked. Use it to pay for any x402-protected endpoint.

```tsx
import { PaywallButton } from "@tollbooth/paywall";

<PaywallButton
  endpoint="https://api.example.com/report"
  onSuccess={(result) => console.log("paid", result)}
  onError={(err) => console.error(err)}
>
  Download Report
</PaywallButton>
```

Render prop variant for custom loading state:

```tsx
<PaywallButton endpoint="/api/data">
  {({ isPaying }) => isPaying ? "Paying..." : "Get Data"}
</PaywallButton>
```

| Prop | Type | Default |
|------|------|---------|
| `endpoint` | `string` | required |
| `method` | `string` | `"GET"` |
| `body` | `BodyInit \| Record<string, unknown>` | — |
| `headers` | `Record<string, string>` | — |
| `onSuccess` | `(result: PaymentResult) => void` | — |
| `onError` | `(error: Error) => void` | — |
| `children` | `ReactNode \| (state) => ReactNode` | `"Pay"` |

---

### `PaywallGate`

Probes an endpoint, shows a pay prompt if 402, then renders the unlocked content via render prop.

```tsx
import { PaywallGate } from "@tollbooth/paywall";

<PaywallGate endpoint="https://api.example.com/article/1">
  {(data) => <article>{data.content}</article>}
</PaywallGate>
```

| Prop | Type | Default |
|------|------|---------|
| `endpoint` | `string` | required |
| `method` | `string` | `"GET"` |
| `body` | `BodyInit \| Record<string, unknown>` | — |
| `headers` | `Record<string, string>` | — |
| `children` | `(data: unknown, settlement?) => ReactNode` | required |
| `loadingContent` | `ReactNode` | spinner |
| `autoProbe` | `boolean` | `true` |

---

### `PaywallVideo`

A locked video player that unlocks after payment. Shows a poster/thumbnail with a lock overlay until paid.

```tsx
import { PaywallVideo } from "@tollbooth/paywall";

<PaywallVideo
  endpoint="https://api.example.com/video/intro.mp4"
  poster="/thumbnails/intro.jpg"
/>
```

| Prop | Type | Default |
|------|------|---------|
| `endpoint` | `string` | required |
| `poster` | `string` | — |
| `className` | `string` | — |

---

### `PaywallChat`

A chat UI that sends each message as a paid request to an OpenAI-compatible streaming endpoint.

```tsx
import { PaywallChat } from "@tollbooth/paywall";

<PaywallChat
  endpoint="https://api.example.com/chat"
  model="gpt-4o"
  systemPrompt="You are a helpful assistant."
  placeholder="Ask me anything..."
/>
```

| Prop | Type | Default |
|------|------|---------|
| `endpoint` | `string` | required |
| `model` | `string` | required |
| `systemPrompt` | `string` | — |
| `placeholder` | `string` | `"Type a message..."` |
| `className` | `string` | — |

---

### `TxHistory`

Renders the current session's transaction history from context.

```tsx
import { TxHistory } from "@tollbooth/paywall";

<TxHistory />
```

---

## Hooks

### `usePaywall`

Low-level hook for building custom payment UIs.

```tsx
import { usePaywall } from "@tollbooth/paywall";

function MyComponent() {
  const { pay, isPaying, state } = usePaywall();

  return (
    <button onClick={() => pay("/api/resource")} disabled={isPaying}>
      {isPaying ? "Paying..." : "Unlock"}
    </button>
  );
}
```

### `useTollbooth`

Access the raw context: `paymentFetch`, `isReady`, `address`, `transactions`, `recordTx`.

```tsx
import { useTollbooth } from "@tollbooth/paywall";

const { paymentFetch, isReady, address } = useTollbooth();
```

## Styling

Import the default stylesheet or bring your own. All elements use `data-tollbooth` attributes for styling hooks:

```css
[data-tollbooth="button"] { /* pay button */ }
[data-tollbooth="gate"] { /* gate wrapper */ }
[data-tollbooth="gate-prompt"] { /* pre-payment prompt */ }
[data-tollbooth="chat"] { /* chat container */ }
[data-tollbooth="video"] { /* video wrapper */ }
[data-tollbooth="spinner"] { /* loading spinner */ }
[data-tollbooth="settlement"] { /* tx link after payment */ }
```

## How it works

1. Components probe the target endpoint with a normal `fetch`
2. A `402 Payment Required` response triggers the x402 payment flow
3. The wallet signs a USDC payment authorization (EIP-3009)
4. The signed payment is attached to the request header and retried
5. On success, content is rendered and a `TxRecord` is added to history

Built on [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch) and [`@x402/core`](https://www.npmjs.com/package/@x402/core).

## License

MIT
