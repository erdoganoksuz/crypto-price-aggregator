import { COINGECKO } from "../config/index.js";

class CoinGeckoTransformer {
  formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return null;
    return Number(value.toFixed(decimals));
  }

  transformExchangeData(ticker) {
    if (!ticker?.market?.name || !ticker?.market?.identifier) {
      return null;
    }

    // Get price in target currency or fallback to USD
    const price = ticker.converted_last?.[COINGECKO.DEFAULT_VS_CURRENCY];

    // Get volume in target currency or fallback to USD
    const volume = ticker.converted_volume?.[COINGECKO.DEFAULT_VS_CURRENCY];

    return {
      name: ticker.market.name,
      identifier: ticker.market.identifier,
      price_usdt: this.formatNumber(price),
      volume_usdt: this.formatNumber(volume, 0),
      trust_score: ticker.trust_score || null,
      last_updated: ticker.last_traded_at || ticker.last_fetch_at,
      base: ticker.base,
      target: ticker.target,
    };
  }

  transformCryptoData(coin, averagePriceUSDT, exchanges) {
    if (!coin?.id || !coin?.symbol) {
      return null;
    }

    return {
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      price_usdt: this.formatNumber(averagePriceUSDT),
      timestamp: Date.now(),
      price_change_24h: this.formatNumber(coin.price_change_percentage_24h),
      market_cap: this.formatNumber(coin.market_cap, 0),
      volume_24h: this.formatNumber(coin.total_volume, 0),
      exchanges: exchanges.filter((exchange) => exchange !== null),
    };
  }

  calculateAveragePrice(prices) {
    const validPrices = prices.filter(
      (price) => price !== null && price !== undefined
    );
    return validPrices.length > 0
      ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
      : null;
  }

  validateCoinData(coin) {
    return (
      coin &&
      coin.id &&
      coin.symbol &&
      typeof coin.price_change_percentage_24h === "number" &&
      typeof coin.market_cap === "number" &&
      typeof coin.total_volume === "number"
    );
  }

  validateExchangeData(ticker) {
    // Check if we have USD price in converted_last
    const hasValidPrice =
      ticker?.converted_last?.[COINGECKO.DEFAULT_VS_CURRENCY] !== undefined;

    const result =
      ticker &&
      ticker.market &&
      ticker.market.name &&
      ticker.market.identifier &&
      hasValidPrice;

    return result;
  }
}

export default CoinGeckoTransformer;
