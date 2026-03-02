import {
	ConnectButton,
	getDefaultConfig,
	RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { http, WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";
import "../src/styles/tollbooth.css";

import {
	PaywallButton,
	PaywallGate,
	PaywallVideo,
	TollboothProvider,
} from "../src/index";

const config = getDefaultConfig({
	appName: "@tollbooth/paywall demo",
	projectId: "tollbooth-paywall-demo",
	chains: [baseSepolia],
	transports: {
		[baseSepolia.id]: http(),
	},
});

const queryClient = new QueryClient();

// Local mock server serves both frontend and API on the same origin
const DEMO_ENDPOINT = "/api";

function App() {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>
					<TollboothProvider>
						<div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
							<h1>@tollbooth/paywall Demo</h1>
							<div style={{ marginBottom: 24 }}>
								<ConnectButton />
							</div>

							<section style={{ marginBottom: 32 }}>
								<h2>PaywallButton</h2>
								<p>Click to make a single paid request:</p>
								<PaywallButton
									endpoint={`${DEMO_ENDPOINT}/data`}
									method="GET"
									onSuccess={({ response, settlement }) => {
										console.log("Success!", settlement);
										response.json().then((d) => console.log("Data:", d));
									}}
									onError={(err) => console.error("Error:", err)}
								>
									Fetch Premium Data
								</PaywallButton>
							</section>

							<section style={{ marginBottom: 32 }}>
								<h2>PaywallGate</h2>
								<p>Content hidden until payment:</p>
								<PaywallGate endpoint={`${DEMO_ENDPOINT}/article`}>
									{(data) => (
										<pre style={{ whiteSpace: "pre-wrap" }}>
											{JSON.stringify(data, null, 2)}
										</pre>
									)}
								</PaywallGate>
							</section>

							<section style={{ marginBottom: 32 }}>
								<h2>PaywallVideo</h2>
								<p>Pay to unlock premium video content:</p>
								<PaywallVideo endpoint={`${DEMO_ENDPOINT}/video`} />
							</section>
						</div>
					</TollboothProvider>
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}

// biome-ignore lint/style/noNonNullAssertion: The root element is guaranteed to exist
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
