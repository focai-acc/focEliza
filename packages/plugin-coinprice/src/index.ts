import { Plugin } from "@elizaos/core";
import getPrice from "./actions/getPrice";

export const coinPricePlugin: Plugin = {
    name: "coinprice",
    description: "Plugin for cryptocurrency price checking using CoinGecko API (priority), CoinMarketCap API (fallback), or CoinCap API (free fallback) when no API keys are provided",
    actions: [getPrice],
    evaluators: [],
    providers: [],
};

export default coinPricePlugin;
