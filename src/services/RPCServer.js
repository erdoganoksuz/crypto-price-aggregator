import RPC from "@hyperswarm/rpc";
import DHT from "hyperdht";
import { DHT as DHT_CONFIG } from "../config/index.js";

class RPCServer {
  constructor(database, coinGeckoService) {
    this.database = database;
    this.coinGeckoService = coinGeckoService;
    this.dht = null;
    this.rpc = null;
    this.server = null;
  }

  async initialize() {
    try {
      console.log("\n=== Initializing RPC Server ===");

      // Get key pair from database
      const keyPair = await this.database.getOrCreateDHTSeed();

      this.dht = new DHT({
        port: DHT_CONFIG.SERVER_PORT,
        bootstrap: DHT_CONFIG.BOOTSTRAP,
        keyPair,
      });

      // Wait for DHT to be ready
      await this.dht.ready();
      console.log("DHT is ready");

      // Setup RPC server
      console.log("\nSetting up RPC server...");
      const rpcSeed = await this.database.getOrCreateRPCSeed();
      this.rpc = new RPC({ dht: this.dht, seed: rpcSeed });
      this.server = this.rpc.createServer();

      // Register RPC methods
      this.registerMethods();
      console.log("RPC methods registered");

      // Start server and wait for it to be ready
      await this.server.listen();
      console.log("RPC server is listening");
      const publicKey = this.server.publicKey.toString("hex");
      console.log("\n=== Server Initialization Complete ===");
      console.log("Use this public key to connect:", publicKey);
      console.log("=====================================\n");
      return publicKey;
    } catch (error) {
      console.error("\nFailed to initialize RPC server:", error);
      // Cleanup on failure
      if (this.server) {
        await this.server.close();
      }
      if (this.dht) {
        await this.dht.destroy();
      }
      throw error;
    }
  }

  registerMethods() {
    // Register ping method
    this.server.respond("ping", async (reqRaw) => {
      try {
        console.log("Received raw ping request:", reqRaw);

        // reqRaw is Buffer, we need to parse it
        const req = JSON.parse(reqRaw.toString("utf-8"));
        console.log("Parsed ping request:", req);

        if (!req.nonce) {
          throw new Error("Missing nonce in ping request");
        }

        const resp = { nonce: req.nonce, pong: true };
        console.log("Sending ping response:", resp);

        // we also need to return buffer response
        return Buffer.from(JSON.stringify(resp), "utf-8");
      } catch (error) {
        console.error("Error in ping method:", error);
        // Return error response instead of throwing
        return Buffer.from(JSON.stringify({ error: error.message }), "utf-8");
      }
    });

    // Get latest prices
    this.server.respond("getLatestPrices", async (req) => {
      try {
        const { pairs } = JSON.parse(req.toString("utf-8"));
        const prices = await this.coinGeckoService.getLatestPrices(pairs);
        return Buffer.from(JSON.stringify(prices), "utf-8");
      } catch (error) {
        console.error("Error in getLatestPrices:", error);
        return Buffer.from(JSON.stringify({ error: error.message }), "utf-8");
      }
    });

    // Get historical prices
    this.server.respond("getHistoricalPrices", async (req) => {
      try {
        const { pairs, from, to } = JSON.parse(req.toString("utf-8"));
        const prices = await this.coinGeckoService.getHistoricalPrices(
          pairs,
          from,
          to
        );
        return Buffer.from(JSON.stringify(prices), "utf-8");
      } catch (error) {
        console.error("Error in getHistoricalPrices:", error);
        return Buffer.from(JSON.stringify({ error: error.message }), "utf-8");
      }
    });

    // Trigger on-demand data collection
    this.server.respond("triggerCollection", async () => {
      try {
        const result = await this.coinGeckoService.collectData();
        return Buffer.from(JSON.stringify(result), "utf-8");
      } catch (error) {
        console.error("Error in triggerCollection:", error);
        return Buffer.from(JSON.stringify({ error: error.message }), "utf-8");
      }
    });

    // Get collection status
    this.server.respond("getCollectionStatus", () => {
      try {
        const status = this.coinGeckoService.getCollectionStatus();
        return Buffer.from(JSON.stringify(status), "utf-8");
      } catch (error) {
        console.error("Error in getCollectionStatus:", error);
        return Buffer.from(JSON.stringify({ error: error.message }), "utf-8");
      }
    });

    // Start scheduled collection
    this.server.respond("startCollection", () => {
      try {
        this.coinGeckoService.startCollection();
        return Buffer.from(JSON.stringify({ success: true }), "utf-8");
      } catch (error) {
        console.error("Error in startCollection:", error);
        return Buffer.from(JSON.stringify({ error: error.message }), "utf-8");
      }
    });

    // Stop scheduled collection
    this.server.respond("stopCollection", () => {
      try {
        this.coinGeckoService.stopCollection();
        return Buffer.from(JSON.stringify({ success: true }), "utf-8");
      } catch (error) {
        console.error("Error in stopCollection:", error);
        return Buffer.from(JSON.stringify({ error: error.message }), "utf-8");
      }
    });
  }

  async destroy() {
    console.log("\nShutting down RPC server...");
    if (this.server) {
      await this.server.close();
      console.log("RPC server closed");
    }
    if (this.dht) {
      await this.dht.destroy();
      console.log("DHT destroyed");
    }
    console.log("RPC server shutdown complete");
  }
}

export default RPCServer;
