// Database paths
export const DB_PATHS = {
  SERVER: "./db/rpc-server",
  CLIENT: "./db/rpc-client",
};

// DHT configuration
export const DHT = {
  SERVER_PORT: 40001,
  CLIENT_PORT: 30001,
  BOOTSTRAP: [{ host: "127.0.0.1", port: 30001 }], // Local bootstrap node
};

// Key configuration
export const KEYS = {
  DHT_SEED: "dht-seed",
  RPC_SEED: "rpc-seed",
  SEED_SIZE: 32,
};

// CoinGecko API configuration
export const COINGECKO = {
  BASE_URL: "https://api.coingecko.com/api/v3",
  HEADERS: {
    "x-cg-demo-api-key": "CG-NbuY9iYHac39WjFUPtnDmsnF",
  },
  DEFAULT_VS_CURRENCY: "usd",
  TARGET_CURRENCY: "usdt",
  TOP_EXCHANGES: ["binance", "coinbase", "kraken"],
  ENDPOINTS: {
    MARKETS: "/coins/markets",
    TICKERS: "/coins/{id}/tickers",
    SIMPLE_PRICE: "/simple/price",
    SUPPORTED_VS_CURRENCIES: "/simple/supported_vs_currencies",
  },
  // Top 5 cryptocurrencies by market cap
  TOP_CRYPTOS: ["bitcoin", "ethereum", "tether", "binancecoin", "ripple"],
};

// Data collection configuration
export const TOP_CRYPTO_COUNT = 5;
export const TOP_EXCHANGES_COUNT = 5;
export const UPDATE_INTERVAL = 30000; // 30 seconds
