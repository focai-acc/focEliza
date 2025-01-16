import axios from "axios";
import { ApiResponse, PriceData } from "./types";

const COINMARKETCAP_BASE_URL = "https://pro-api.coinmarketcap.com/v1";
const COINCAP_BASE_URL = "https://api.coincap.io/v2";
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

export const createPriceService = (coingeckoApiKey?: string, coinmarketcapApiKey?: string) => {
    const coingeckoClient = coingeckoApiKey ? axios.create({
        baseURL: COINGECKO_BASE_URL,
        headers: {
            "x-cg-demo-api-key": coingeckoApiKey,
            Accept: "application/json",
        },
    }) : null;

    const coinmarketcapClient = coinmarketcapApiKey ? axios.create({
        baseURL: COINMARKETCAP_BASE_URL,
        headers: {
            "X-CMC_PRO_API_KEY": coinmarketcapApiKey,
            Accept: "application/json",
        },
    }) : null;

    const coincapClient = axios.create({
        baseURL: COINCAP_BASE_URL,
        headers: {
            Accept: "application/json",
        },
    });

    const getPrice = async (
        symbol: string,
        currency: string,
        cryptoName: string,
    ): Promise<PriceData> => {
        const normalizedCrypto = cryptoName.toLowerCase().trim();
        const normalizedSymbol = symbol.toUpperCase().trim();
        const normalizedCurrency = currency.toUpperCase().trim();

        try {
            // Try CoinGecko first if API key is available
            if (coingeckoClient) {
                const response = await coingeckoClient.get(`/simple/price`, {
                    params: {
                        ids: normalizedCrypto,
                        vs_currencies: normalizedCurrency.toLowerCase(),
                        include_market_cap: true,
                        include_24hr_vol: true,
                        include_24hr_change: true,
                    },
                });

                const data = response.data[normalizedCrypto];
                if (!data) {
                    throw new Error(`No data found for cryptocurrency: ${normalizedCrypto}`);
                }

                const currencyKey = normalizedCurrency.toLowerCase();
                return {
                    price: data[currencyKey],
                    marketCap: data[`${currencyKey}_market_cap`],
                    volume24h: data[`${currencyKey}_24h_vol`],
                    percentChange24h: data[`${currencyKey}_24h_change`],
                };
            }
            // Try CoinMarketCap if API key is available
            else if (coinmarketcapClient) {
                const response = await coinmarketcapClient.get<ApiResponse>(
                    "/cryptocurrency/quotes/latest",
                    {
                        params: {
                            symbol: normalizedSymbol,
                            convert: normalizedCurrency,
                        },
                    }
                );

                const symbolData = response.data.data[normalizedSymbol];
                if (!symbolData) {
                    throw new Error(
                        `No data found for symbol: ${normalizedSymbol}`
                    );
                }

                const quoteData = symbolData.quote[normalizedCurrency];
                if (!quoteData) {
                    throw new Error(
                        `No quote data found for currency: ${normalizedCurrency}`
                    );
                }

                return {
                    price: quoteData.price,
                    marketCap: quoteData.market_cap,
                    volume24h: quoteData.volume_24h,
                    percentChange24h: quoteData.percent_change_24h,
                };
            }
            // Fallback to CoinCap API
            else {
                // CoinCap only supports USD
                if (normalizedCurrency !== "USD") {
                    throw new Error("CoinCap API only supports USD currency");
                }

                const response = await coincapClient.get(`/assets/${normalizedCrypto}`);
                const data = response.data.data;

                if (!data) {
                    throw new Error(`No data found for cryptocurrency: ${normalizedCrypto}`);
                }

                return {
                    price: parseFloat(data.priceUsd),
                    marketCap: parseFloat(data.marketCapUsd),
                    volume24h: parseFloat(data.volumeUsd24Hr),
                    percentChange24h: parseFloat(data.changePercent24Hr),
                };
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage =
                    error.response?.data?.status?.error_message ||
                    error.response?.data?.error ||
                    error.message;
                console.error("API Error:", errorMessage);
                throw new Error(`API Error: ${errorMessage}`);
            }
            throw error;
        }
    };

    return { getPrice };
}
