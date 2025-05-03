import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import crypto from "crypto";
import DHT from "hyperdht";
import { KEYS } from "../config/index.js";

class Database {
  constructor(databasePath) {
    this.hypercore = new Hypercore(databasePath);
    this.binaryStore = new Hyperbee(this.hypercore, {
      keyEncoding: "utf-8",
      valueEncoding: "binary",
    });
    this.jsonStore = new Hyperbee(this.hypercore, {
      keyEncoding: "utf-8",
      valueEncoding: "json",
    });
  }

  async initialize() {
    await this.binaryStore.ready();
    await this.jsonStore.ready();
  }

  async getOrCreateDHTSeed() {
    const existingSeed = await this.binaryStore.get(KEYS.DHT_SEED);

    if (existingSeed) {
      // If we have an existing key pair, return it
      return existingSeed.value;
    }

    // Generate a new key pair
    const seed = crypto.randomBytes(KEYS.SEED_SIZE);
    await this.binaryStore.put(KEYS.DHT_SEED, seed);

    return seed;
  }

  async getOrCreateRPCSeed() {
    const existingSeed = await this.binaryStore.get(KEYS.RPC_SEED);

    if (existingSeed) {
      return existingSeed.value;
    }

    // Generate a new RPC seed
    const seed = crypto.randomBytes(KEYS.SEED_SIZE);
    await this.binaryStore.put(KEYS.RPC_SEED, seed);
    return seed;
  }

  async storeCryptoPriceData(cryptoId, data) {
    try {
      const key = `${cryptoId}:${Date.now()}`;
      await this.jsonStore.put(key, data);
      console.log(`Successfully stored data for ${cryptoId}`);
    } catch (error) {
      console.error(`Error storing data for ${cryptoId}:`, error);
      throw error;
    }
  }

  async getLatestCryptoPrices(cryptoIds) {
    try {
      console.log("Getting latest prices for:", cryptoIds);
      const priceResults = {};

      // If no specific IDs provided, get all available data
      if (!cryptoIds || cryptoIds.length === 0) {
        console.log("No specific IDs provided, getting all data");
        const stream = this.jsonStore.createReadStream({
          reverse: true,
        });

        const seenIds = new Set();
        for await (const { key, value } of stream) {
          const [id] = key.split(":");
          if (!seenIds.has(id)) {
            priceResults[id] = value;
            seenIds.add(id);
          }
        }
        console.log("Found data for all cryptos:", priceResults);
        return priceResults;
      }

      // Get specific crypto IDs
      for (const cryptoId of cryptoIds) {
        console.log(`Getting latest price for ${cryptoId}`);
        const priceStream = this.jsonStore.createReadStream({
          gt: `${cryptoId}:`,
          lt: `${cryptoId}:~`,
          reverse: true,
          limit: 1,
        });

        for await (const { value } of priceStream) {
          priceResults[cryptoId] = value;
          console.log(`Found data for ${cryptoId}:`, value);
          break;
        }
      }

      console.log("Final price results:", priceResults);
      return priceResults;
    } catch (error) {
      console.error("Error getting latest crypto prices:", error);
      throw error;
    }
  }

  async getHistoricalCryptoPrices(cryptoIds, startTimestamp, endTimestamp) {
    try {
      console.log("Getting historical prices for:", cryptoIds);
      console.log(
        "Time range:",
        new Date(startTimestamp),
        "to",
        new Date(endTimestamp)
      );

      const historicalResults = {};
      for (const cryptoId of cryptoIds) {
        console.log(`Getting historical data for ${cryptoId}`);
        historicalResults[cryptoId] = [];
        const priceStream = this.jsonStore.createReadStream({
          gt: `${cryptoId}:${startTimestamp}`,
          lt: `${cryptoId}:${endTimestamp}`,
        });

        for await (const { value } of priceStream) {
          historicalResults[cryptoId].push(value);
        }
        console.log(
          `Found ${historicalResults[cryptoId].length} historical entries for ${cryptoId}`
        );
      }

      console.log("Historical results:", historicalResults);
      return historicalResults;
    } catch (error) {
      console.error("Error getting historical crypto prices:", error);
      throw error;
    }
  }

  async cleanup() {
    // Close all Hyperbee instances
    await this.binaryStore.close();
    await this.jsonStore.close();
    // Close the Hypercore instance
    await this.hypercore.close();
  }
}

export default Database;
