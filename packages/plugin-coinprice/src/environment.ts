import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const coinmarketcapEnvSchema = z.object({
    COINGECKO_API_KEY: z.string().optional(),
    COINMARKETCAP_API_KEY: z.string().optional(),
});

export type CoinMarketCapConfig = z.infer<typeof coinmarketcapEnvSchema>;

export async function validateCoinMarketCapConfig(
    runtime: IAgentRuntime
): Promise<CoinMarketCapConfig> {
    try {
        const config = {
            COINGECKO_API_KEY: runtime.getSetting("COINGECKO_API_KEY"),
            COINMARKETCAP_API_KEY: runtime.getSetting("COINMARKETCAP_API_KEY"),
        };

        return coinmarketcapEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
