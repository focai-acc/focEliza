# @elizaos/plugin-coinprice

A plugin for Eliza that enables cryptocurrency price checking. API provider options are CoinGecko, CoinMarketCap, and CoinCap. If no CoinGecko or CoinMarketCap API key is provided, CoinCap free API will be used.

## Features

- Real-time cryptocurrency price checking
- Support for multiple cryptocurrencies (BTC, ETH, SOL, etc.)
- Currency conversion (USD, EUR, etc.)
- Detailed price and market data
- Natural language processing for price queries

## Installation

```bash
npm install @elizaos/plugin-coinprice
```

## Configuration

1. Get your API key from [CoinGecko](https://www.coingecko.com/en/api) or [CoinMarketCap](https://pro.coinmarketcap.com) (or fallback to CoinCap)

2. Set up your environment variables:

```bash
COINMARKETCAP_API_KEY=your_api_key
COINGECKO_API_KEY=your_api_key
```

3. Register the plugin in your Eliza configuration:

```typescript
import { CoinPricePlugin } from "@elizaos/plugin-coinprice";

// In your Eliza configuration
plugins: [
    new CoinPricePlugin(),
    // ... other plugins
];
```

## Usage

The plugin responds to natural language queries about cryptocurrency prices. Here are some examples:

```plaintext
"What's the current price of Bitcoin?"
"Show me ETH price in USD"
"Get the price of SOL"
```

### Supported Cryptocurrencies

The plugin supports major cryptocurrencies including:

- Bitcoin (BTC)
- Ethereum (ETH)
- Solana (SOL)
- USD Coin (USDC)
- And many more...

### Available Actions

#### GET_PRICE

Fetches the current price of a cryptocurrency.

```typescript
// Example response format
{
  symbol: "BTC",
  price: 50000.00,
  currency: "USD",
  marketCap: 1000000000000,
  volume24h: 50000000000,
  percentChange24h: 2.5
}
```

## API Reference

### Environment Variables

| Variable              | Description                | Required |
| --------------------- | -------------------------- | -------- |
| COINMARKETCAP_API_KEY | Your CoinMarketCap API key | No       |
| COINGECKO_API_KEY     | Your CoinGecko API key     | No       |

### Types

```typescript
interface PriceData {
    price: number;
    marketCap: number;
    volume24h: number;
    percentChange24h: number;
}

interface GetPriceContent {
    symbol: string;
    currency: string;
}
```

## Error Handling

The plugin includes comprehensive error handling for:

- Invalid API keys
- Rate limiting
- Network timeouts
- Invalid cryptocurrency symbols
- Unsupported currencies

## Rate Limits

CoinGecko API has different rate limits based on your subscription plan. Please refer to [CoinGecko's pricing page](https://www.coingecko.com/en/api) for detailed information.

CoinMarketCap API has different rate limits based on your subscription plan. Please refer to [CoinMarketCap's pricing page](https://coinmarketcap.com/api/pricing/) for detailed information.

CoinCap API has different rate limits based on your subscription plan. Please refer to [CoinCap's pricing page](https://coincap.io/api) for detailed information.

## Support

For support, please open an issue in the repository or reach out to the maintainers:

- Discord: proteanx, 0xspit

## Links

- [CoinGecko API Documentation](https://www.coingecko.com/en/api)
- [CoinCap API Documentation](https://docs.coincap.io/)
- [CoinMarketCap API Documentation](https://coinmarketcap.com/api/documentation/v1/)
- [GitHub Repository](https://github.com/elizaos/eliza/tree/main/packages/plugin-coinprice)
