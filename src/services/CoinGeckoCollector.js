import axios from "axios";
import { COINGECKO } from "../config/index.js";
import CoinGeckoTransformer from "./CoinGeckoTransformer.js";

class CoinGeckoCollector {
  constructor() {
    this.baseURL = COINGECKO.BASE_URL;
    this.headers = COINGECKO.HEADERS;
    this.transformer = new CoinGeckoTransformer();
  }

  async getTopCryptos() {
    try {
      const response = await axios.get(
        `${this.baseURL}${COINGECKO.ENDPOINTS.MARKETS}`,
        {
          headers: this.headers,
          params: {
            vs_currency: COINGECKO.DEFAULT_VS_CURRENCY,
            order: "market_cap_desc",
            per_page: COINGECKO.TOP_CRYPTOS.length,
            page: 1,
            sparkline: false,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching top cryptocurrencies:", error.message);
      throw error;
    }
  }

  async getExchangeData(coinId) {
    try {
      const response = await axios.get(
        `${this.baseURL}${COINGECKO.ENDPOINTS.TICKERS.replace("{id}", coinId)}`,
        {
          headers: this.headers,
          params: {
            exchange_ids: COINGECKO.TOP_EXCHANGES.join(","),
          },
        }
      );

      return response.data.tickers;
    } catch (error) {
      console.error(
        `Error fetching exchange data for ${coinId}:`,
        error.message
      );
      throw error;
    }
  }

  validateExchangeData(exchangeData) {
    if (!exchangeData || !Array.isArray(exchangeData)) {
      console.log("Invalid exchange data format");
      return false;
    }

    // Check for valid USD or USDT prices
    const validExchanges = exchangeData.filter((exchange) => {
      const hasUsdPrice = exchange.converted_last?.usd;
      const hasUsdtPrice = exchange.converted_last?.usdt;
      const isValid = hasUsdPrice || hasUsdtPrice;

      if (!isValid) {
        console.log(
          `No valid USD/USDT prices found for ${exchange.market.name}`
        );
      }

      return isValid;
    });

    if (validExchanges.length === 0) {
      console.log("No valid exchanges found with USD/USDT prices");
      return false;
    }

    return true;
  }

  async processCoin(coin) {
    try {
      if (!this.transformer.validateCoinData(coin)) {
        console.log(`Invalid coin data for ${coin.id}`);
        return null;
      }

      const exchangeData = await this.getExchangeData(coin.id);
      if (!exchangeData || !Array.isArray(exchangeData)) {
        console.log(`No exchange data found for ${coin.id}`);
        return null;
      }

      // Transform and validate exchange data
      const transformedExchanges = exchangeData
        .map((ticker) => this.transformer.transformExchangeData(ticker))
        .filter((exchange) => exchange !== null);

      if (transformedExchanges.length === 0) {
        console.log(`No valid exchanges found for ${coin.id}`);
        return null;
      }

      // Calculate average price from valid exchanges
      const averagePriceUSDT = this.transformer.calculateAveragePrice(
        transformedExchanges.map((exchange) => exchange.price_usdt)
      );

      if (!averagePriceUSDT) {
        console.log(`Could not calculate average price for ${coin.id}`);
        return null;
      }

      // Transform the final coin data
      return this.transformer.transformCryptoData(
        coin,
        averagePriceUSDT,
        transformedExchanges
      );
    } catch (error) {
      console.error(`Error processing ${coin.id}:`, error.message);
      return null;
    }
  }

  async collectData() {
    try {
      const coins = await this.getTopCryptos();
      const processedData = [];

      for (const coin of coins) {
        const processedCoin = await this.processCoin(coin);
        if (processedCoin) {
          processedData.push(processedCoin);
        }
      }

      console.log("Data collection completed at:", new Date().toISOString());
      return processedData;
    } catch (error) {
      console.error("Error collecting crypto data:", error);
      throw error;
    }
  }
}

export default CoinGeckoCollector;
