export const getPriceTemplate = `Respond with a JSON object containing symbol, cryptoName, and currency. Currency must default to "USD" if not specified.

Here are the cryptocurrency symbol mappings:
- bitcoin/btc -> BTC (cryptoName: bitcoin)
- ethereum/eth -> ETH (cryptoName: ethereum)
- solana/sol -> SOL (cryptoName: solana)
- cardano/ada -> ADA (cryptoName: cardano)
- ripple/xrp -> XRP (cryptoName: ripple)
- dogecoin/doge -> DOGE (cryptoName: dogecoin)
- polkadot/dot -> DOT (cryptoName: polkadot)
- usdc -> USDC (cryptoName: usd-coin)
- tether/usdt -> USDT (cryptoName: tether)
- shiba-inu/shib -> SHIB (cryptoName: shiba-inu)
- litecoin/ltc -> LTC (cryptoName: litecoin)
- bnb/bnb -> BNB (cryptoName: binance-smart-chain)
- avalanche/avax -> AVAX (cryptoName: avalanche)
- fantom/ftm -> FTM (cryptoName: fantom)
- optimism/op -> OP (cryptoName: optimism)
- arbitrum/arb -> ARB (cryptoName: arbitrum)
- polygon/matic -> MATIC (cryptoName: polygon)
- devault/dvt -> DVT (cryptoName: devault)
- bitcoin-cash/bch -> BCH (cryptoName: bitcoin-cash)
- litecoin/ltc -> LTC (cryptoName: litecoin)
- rune-pups/pups -> PUPS (cryptoName: pups)
- tron/trx -> TRX (cryptoName: tron)
- sui/sui -> SUI (cryptoName: sui)
- aptos/aptos -> APTOS (cryptoName: aptos)
- toncoin/ton -> TON (cryptoName: toncoin)
- tezos/xtz -> XTZ (cryptoName: tezos)
- kusama/ksm -> KSM (cryptoName: kusama)
- cosmos/atom -> ATOM (cryptoName: cosmos)
- filecoin/fil -> FIL (cryptoName: filecoin)
- stellar/xlm -> XLM (cryptoName: stellar)
- chainlink/link -> LINK (cryptoName: chainlink)
- nexa/nex -> NEX (cryptoName: nexa)
- kadena/kda -> KDA (cryptoName: kadena)
- kava/kava -> KAVA (cryptoName: kava)


IMPORTANT: Response must ALWAYS include "symbol", "cryptoName", and "currency" fields.

Example response:
\`\`\`json
{
    "symbol": "BTC",
    "cryptoName": "bitcoin",
    "currency": "USD"
}
\`\`\`

{{recentMessages}}

Extract the cryptocurrency from the most recent message. Always include currency (default "USD").
Respond with a JSON markdown block containing symbol, cryptoName, and currency.`;
