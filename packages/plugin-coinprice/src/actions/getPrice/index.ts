import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import { priceExamples } from "./examples";
import { createPriceService } from "./service";
import { getPriceTemplate } from "./template";
import { GetPriceContent } from "./types";
import { isGetPriceContent } from "./validation";

export default {
    name: "GET_PRICE",
    similes: [
        "CHECK_PRICE",
        "PRICE_CHECK",
        "GET_CRYPTO_PRICE",
        "CHECK_CRYPTO_PRICE",
        "GET_TOKEN_PRICE",
        "CHECK_TOKEN_PRICE",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // Always validate to true since we have a fallback API
        return true;
    },
    description: "Get the current price of a cryptocurrency from CoinGecko, CoinMarketCap, or CoinCap",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting crypto price check handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose and generate price check content
            const priceContext = composeContext({
                state,
                template: getPriceTemplate,
            });

            const content = (await generateObjectDeprecated({
                runtime,
                context: priceContext,
                modelClass: ModelClass.SMALL,
            })) as unknown as GetPriceContent;

            // Validate content
            if (!isGetPriceContent(content)) {
                throw new Error("Invalid price check content");
            }

            // Get API keys if available
            const coingeckoApiKey = runtime.getSetting("COINGECKO_API_KEY");
            const coinmarketcapApiKey = runtime.getSetting("COINMARKETCAP_API_KEY");
            const priceService = createPriceService(coingeckoApiKey, coinmarketcapApiKey);

            try {
                const priceData = await priceService.getPrice(
                    content.symbol,
                    content.currency,
                    content.cryptoName
                );
                elizaLogger.success(
                    `Price retrieved successfully! ${content.cryptoName}: ${priceData.price} ${content.currency.toUpperCase()}`
                );

                if (callback) {
                    callback({
                        text: `The current price of ${content.cryptoName} ${content.symbol} is ${(priceData.price).toLocaleString()} ${content.currency.toUpperCase()} \nMarket Cap is ${(priceData.marketCap).toLocaleString()} ${content.currency.toUpperCase()} \n24h Volume is ${(priceData.volume24h).toLocaleString()} ${content.currency.toUpperCase()} \nThe 24h percent change is ${(priceData.percentChange24h).toFixed(2)}%`,
                        content: {
                            symbol: content.symbol,
                            cryptoName: content.cryptoName,
                            currency: content.currency,
                            ...priceData,
                        },
                    });
                }

                return true;
            } catch (error) {
                elizaLogger.error("Error in GET_PRICE handler:", error);
                if (callback) {
                    callback({
                        text: `Error fetching price: ${error.message}`,
                        content: { error: error.message },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error("Error in GET_PRICE handler:", error);
            if (callback) {
                callback({
                    text: `Error fetching price: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    examples: priceExamples,
} as Action;
