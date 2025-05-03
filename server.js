import Database from "./src/services/Database.js";
import CoinGeckoService from "./src/services/CoinGeckoService.js";
import RPCServer from "./src/services/RPCServer.js";
import { DB_PATHS } from "./src/config/index.js";

const main = async () => {
  let database;
  try {
    // Initialize database
    database = new Database(DB_PATHS.SERVER);
    await database.initialize();

    // Initialize CoinGecko service
    const coinGeckoService = new CoinGeckoService(database);

    // Initialize and start RPC server
    const rpcServer = new RPCServer(database, coinGeckoService);
    const serverPublicKey = await rpcServer.initialize();
    console.log("Server public key:", serverPublicKey);

    // Start data collection with cron scheduling
    coinGeckoService.startCollection();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down...");
      coinGeckoService.stopCollection();
      await rpcServer.destroy();
      if (database) {
        await database.cleanup();
      }
      process.exit(0);
    });
  } catch (error) {
    console.error("Error in main:", error);
    if (database) {
      await database.cleanup();
    }
    process.exit(1);
  }
};

main().catch(console.error);
