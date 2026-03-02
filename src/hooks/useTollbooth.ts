import { useContext } from "react";
import { TollboothContext, type TollboothContextValue } from "../context";

export function useTollbooth(): TollboothContextValue {
	const ctx = useContext(TollboothContext);
	if (ctx === undefined) {
		throw new Error("useTollbooth must be used within a <TollboothProvider>");
	}
	return ctx;
}
