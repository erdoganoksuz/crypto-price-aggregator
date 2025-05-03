import CoinGeckoCollector from "./CoinGeckoCollector.js";
import cron from "node-cron";
import { UPDATE_INTERVAL } from "../config/index.js";

class CoinGeckoService {
  constructor(database) {
    this.database = database;
    this.collector = new CoinGeckoCollector();
    this.isCollecting = false;
    this.lastCollectionTime = null;
    this.cronJob = null;
    this.collectionStats = {
      totalCollections: 0,
      successfulCollections: 0,
      failedCollections: 0,
      lastError: null,
    };
  }

  async collectData() {
    // Prevent overlapping collections
    if (this.isCollecting) {
      console.log("Data collection already in progress, skipping...");
      return;
    }

    try {
      this.isCollecting = true;
      const startTime = Date.now();
      this.collectionStats.totalCollections++;

      // Calculate time since last collection
      if (this.lastCollectionTime) {
        const timeSinceLastCollection = startTime - this.lastCollectionTime;
        console.log(`Time since last collection: ${timeSinceLastCollection}ms`);
      }

      const processedData = await this.collector.collectData();

      // Store processed data
      for (const data of processedData) {
        await this.database.storeCryptoPriceData(data.id, data);
      }

      this.lastCollectionTime = Date.now();
      const collectionDuration = this.lastCollectionTime - startTime;
      this.collectionStats.successfulCollections++;
      this.collectionStats.lastError = null;

      // Display simple price summary
      console.log("\n=== Latest Prices ===");
      processedData.forEach((data) => {
        if (data && data.symbol && typeof data.price_usdt === "number") {
          console.log(
            `${data.symbol.toUpperCase()}: $${data.price_usdt.toFixed(2)}`
          );
        } else {
          console.log(
            `${data?.symbol?.toUpperCase() || "Unknown"}: Price unavailable`
          );
        }
      });
      console.log(`\nCollection completed in ${collectionDuration}ms`);

      return {
        success: true,
        duration: collectionDuration,
        timestamp: this.lastCollectionTime,
        dataCount: processedData.length,
      };
    } catch (error) {
      console.error("Error in data collection and storage:", error);
      this.collectionStats.failedCollections++;
      this.collectionStats.lastError = error.message;
      throw error;
    } finally {
      this.isCollecting = false;
    }
  }

  startCollection() {
    if (this.cronJob) {
      console.log("Collection already started");
      return;
    }

    // Convert milliseconds to cron expression
    const seconds = Math.floor(UPDATE_INTERVAL / 1000);
    const cronExpression = `*/${seconds} * * * * *`;

    console.log(
      `Starting data collection with cron schedule: ${cronExpression}`
    );

    // Initial collection
    this.collectData().catch(console.error);

    // Set up cron job for subsequent collections
    this.cronJob = cron.schedule(
      cronExpression,
      () => {
        this.collectData().catch(console.error);
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );
  }

  stopCollection() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("Data collection stopped");
    }
  }

  getCollectionStatus() {
    return {
      isCollecting: this.isCollecting,
      lastCollectionTime: this.lastCollectionTime,
      isScheduled: !!this.cronJob,
      stats: this.collectionStats,
    };
  }

  async getLatestPrices(pairs = [], forceRealTime = false) {
    try {
      // If real-time data is requested or no data in database
      if (forceRealTime) {
        console.log("Fetching real-time data from CoinGecko...");
        const processedData = await this.collector.collectData();
        console.log("Processed data:", processedData);

        // Store the new data in database
        for (const data of processedData) {
          console.log(`Storing data for ${data.id}:`, data);
          await this.database.storeCryptoPriceData(data.id, data);
        }

        // If no pairs specified, return all data
        if (!pairs || pairs.length === 0) {
          const result = processedData.reduce((acc, data) => {
            acc[data.id] = data;
            return acc;
          }, {});
          console.log("Returning all processed data:", result);
          return result;
        }

        // Filter for specific pairs
        const prices = {};
        for (const data of processedData) {
          if (pairs.includes(data.id)) {
            prices[data.id] = data;
          }
        }
        console.log("Returning filtered prices:", prices);
        return prices;
      }

      // Use database as primary source
      console.log("Fetching data from database...");
      console.log("Requested pairs:", pairs);

      if (!pairs || pairs.length === 0) {
        // Get all available crypto IDs from the database
        const allData = await this.database.getLatestCryptoPrices([]);
        console.log("All data from database:", allData);
        return allData;
      }

      // Get specific pairs from database
      const prices = await this.database.getLatestCryptoPrices(pairs);
      console.log("Prices from database:", prices);

      // If database is empty, fetch real-time data
      if (Object.keys(prices).length === 0) {
        console.log("No data in database, fetching real-time data...");
        return this.getLatestPrices(pairs, true);
      }

      return prices;
    } catch (error) {
      console.error("Error getting latest prices:", error);
      throw error;
    }
  }

  async getHistoricalPrices(pairs, from, to) {
    try {
      if (!pairs || pairs.length === 0) {
        throw new Error("No pairs specified for historical data");
      }

      const fromTimestamp = from
        ? new Date(from).getTime()
        : Date.now() - 24 * 60 * 60 * 1000; // Default to last 24h
      const toTimestamp = to ? new Date(to).getTime() : Date.now();

      console.log("Fetching historical data...");
      console.log("Pairs:", pairs);
      console.log(
        "Time range:",
        new Date(fromTimestamp),
        "to",
        new Date(toTimestamp)
      );

      // Get historical data from database
      const historicalData = await this.database.getHistoricalCryptoPrices(
        pairs,
        fromTimestamp,
        toTimestamp
      );
      console.log("Historical data from database:", historicalData);

      // If no historical data, get current data
      if (Object.keys(historicalData).length === 0) {
        console.log("No historical data found, getting current data...");
        const currentData = await this.getLatestPrices(pairs, true);
        return Object.fromEntries(
          Object.entries(currentData).map(([pair, data]) => [pair, [data]])
        );
      }

      // Get current prices to include latest data point
      const currentData = await this.getLatestPrices(pairs, true);
      console.log("Current data:", currentData);

      for (const [pair, data] of Object.entries(currentData)) {
        if (!historicalData[pair]) {
          historicalData[pair] = [];
        }
        historicalData[pair].push(data);
      }

      return historicalData;
    } catch (error) {
      console.error("Error getting historical prices:", error);
      throw error;
    }
  }
}

export default CoinGeckoService;
