import RPC from "@hyperswarm/rpc";
import DHT from "hyperdht";
import Table from "cli-table3";
import { DHT as DHT_CONFIG, COINGECKO } from "./src/config/index.js";

class PriceClient {
  constructor(serverPublicKey) {
    this.serverPublicKey = serverPublicKey;
    this.dht = null;
    this.rpc = null;
    this.client = null;
  }

  async connect() {
    try {
      // Start DHT
      this.dht = new DHT({
        port: DHT_CONFIG.CLIENT_PORT,
        bootstrap: DHT_CONFIG.BOOTSTRAP,
      });
      await this.dht.ready();

      // Setup RPC client
      this.rpc = new RPC({ dht: this.dht });
      this.client = await this.rpc.connect(
        Buffer.from(this.serverPublicKey, "hex")
      );

      console.log("Connected to price server");
    } catch (error) {
      console.error("Failed to connect:", error);
      throw error;
    }
  }

  async getLatestPrices(cryptoIds) {
    if (!this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const response = await this.client.request(
        "getLatestPrices",
        Buffer.from(JSON.stringify({ pairs: cryptoIds }), "utf-8")
      );
      return JSON.parse(response.toString("utf-8"));
    } catch (error) {
      console.error("Failed to get latest prices:", error);
      throw error;
    }
  }

  async getHistoricalPrices(cryptoIds, startTimestamp, endTimestamp) {
    if (!this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const response = await this.client.request(
        "getHistoricalPrices",
        Buffer.from(
          JSON.stringify({
            pairs: cryptoIds,
            from: startTimestamp,
            to: endTimestamp,
          }),
          "utf-8"
        )
      );
      return JSON.parse(response.toString("utf-8"));
    } catch (error) {
      console.error("Failed to get historical prices:", error);
      throw error;
    }
  }

  async triggerCollection() {
    if (!this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const response = await this.client.request("triggerCollection");
      return JSON.parse(response.toString("utf-8"));
    } catch (error) {
      console.error("Failed to trigger collection:", error);
      throw error;
    }
  }

  async getCollectionStatus() {
    if (!this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const response = await this.client.request("getCollectionStatus");
      return JSON.parse(response.toString("utf-8"));
    } catch (error) {
      console.error("Failed to get collection status:", error);
      throw error;
    }
  }

  async startCollection() {
    if (!this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const response = await this.client.request("startCollection");
      return JSON.parse(response.toString("utf-8"));
    } catch (error) {
      console.error("Failed to start collection:", error);
      throw error;
    }
  }

  async stopCollection() {
    if (!this.client) {
      throw new Error("Not connected to server");
    }

    try {
      const response = await this.client.request("stopCollection");
      return JSON.parse(response.toString("utf-8"));
    } catch (error) {
      console.error("Failed to stop collection:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.dht) {
      await this.dht.destroy();
    }
  }

  formatPriceData(data) {
    const table = new Table({
      head: [
        "Symbol",
        "Price (USDT)",
        "24h Change",
        "24h Volume",
        "Market Cap",
        "Exchanges",
      ],
      style: {
        head: ["cyan"],
        border: ["gray"],
      },
      colWidths: [10, 15, 12, 15, 15, 30],
    });

    for (const [cryptoId, priceData] of Object.entries(data)) {
      const changeColor = priceData.price_change_24h >= 0 ? "green" : "red";
      table.push([
        priceData.symbol,
        `$${priceData.price_usdt.toLocaleString()}`,
        {
          content: `${priceData.price_change_24h.toFixed(2)}%`,
          hAlign: "right",
          vAlign: "center",
          style: { color: changeColor },
        },
        `$${priceData.volume_24h.toLocaleString()}`,
        `$${priceData.market_cap.toLocaleString()}`,
        priceData.exchanges.map((e) => e.name).join(", "),
      ]);
    }

    return table;
  }

  formatHistoricalData(data) {
    const tables = {};
    for (const [cryptoId, priceHistory] of Object.entries(data)) {
      const table = new Table({
        head: [
          "Timestamp",
          "Price (USDT)",
          "24h Change",
          "24h Volume",
          "Market Cap",
        ],
        style: {
          head: ["cyan"],
          border: ["gray"],
        },
        colWidths: [20, 15, 12, 15, 15],
      });

      priceHistory.forEach((price) => {
        const changeColor = price.price_change_24h >= 0 ? "green" : "red";
        table.push([
          new Date(price.timestamp).toLocaleString(),
          `$${price.price_usdt.toLocaleString()}`,
          {
            content: `${price.price_change_24h.toFixed(2)}%`,
            hAlign: "right",
            vAlign: "center",
            style: { color: changeColor },
          },
          `$${price.volume_24h.toLocaleString()}`,
          `$${price.market_cap.toLocaleString()}`,
        ]);
      });

      tables[cryptoId] = table;
    }
    return tables;
  }

  formatCollectionStatus(status) {
    const table = new Table({
      head: ["Status", "Value"],
      style: {
        head: ["cyan"],
        border: ["gray"],
      },
    });

    table.push(
      ["Collection Active", status.isCollecting ? "Yes" : "No"],
      ["Scheduled", status.isScheduled ? "Yes" : "No"],
      [
        "Last Collection",
        status.lastCollectionTime
          ? new Date(status.lastCollectionTime).toLocaleString()
          : "Never",
      ],
      ["Total Collections", status.stats.totalCollections],
      ["Successful", status.stats.successfulCollections],
      ["Failed", status.stats.failedCollections],
      ["Last Error", status.stats.lastError || "None"]
    );

    return table;
  }
}

// Example usage
const main = async () => {
  try {
    const serverPublicKey = process.argv[2];
    if (!serverPublicKey) {
      console.error("Please provide the server's public key as an argument");
      console.error("Usage: node client.js <server-public-key>");
      process.exit(1);
    }

    const client = new PriceClient(serverPublicKey);

    // Connect to the server
    await client.connect();

    // Get collection status
    console.log("\n=== Collection Status ===");
    const status = await client.getCollectionStatus();
    console.log(client.formatCollectionStatus(status).toString());

    // Trigger on-demand collection
    console.log("\n=== Triggering Data Collection ===");
    const collectionResult = await client.triggerCollection();
    console.log("Collection result:", collectionResult);

    // Get latest prices for all top 5 cryptocurrencies
    console.log("\n=== Latest Prices ===");
    const latestPrices = await client.getLatestPrices(COINGECKO.TOP_CRYPTOS);
    console.log(client.formatPriceData(latestPrices).toString());

    // Get historical prices for the last 24 hours
    console.log("\n=== Historical Prices (Last 24 Hours) ===");
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const historicalPrices = await client.getHistoricalPrices(
      COINGECKO.TOP_CRYPTOS,
      oneDayAgo,
      now
    );

    // Display historical data for each cryptocurrency
    const historicalTables = client.formatHistoricalData(historicalPrices);
    for (const [cryptoId, table] of Object.entries(historicalTables)) {
      console.log(`\n=== ${cryptoId.toUpperCase()} Price History ===`);
      console.log(table.toString());
    }

    // Disconnect
    await client.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main().catch(console.error);
