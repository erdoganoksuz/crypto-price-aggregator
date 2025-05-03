# Crypto Price Aggregator

A decentralized cryptocurrency price aggregator using HyperDHT and RPC.

## Features

- Real-time price data from multiple exchanges
- P2P networking with HyperDHT
- Historical price storage
- CLI interface with formatted tables

## Quick Start

1. Install global dependencies:

```bash
npm install -g hyperdht
```

2. Start DHT bootstrap node:

```bash
hyperdht --bootstrap --host 127.0.0.1 --port 30001
```

3. Install project dependencies:

```bash
npm install
```

4. Start server:

```bash
node server.js
```

5. Run client:

```bash
node client.js <server-public-key>
```

## Project Structure

```
├── src/
│   ├── config/     # Configuration
│   ├── services/   # Core services
│   └── utils/      # Utilities
├── server.js       # Server entry
├── client.js       # Client entry
└── package.json
```

## Missing Features

- Docker support
- Multiple client instances
- Price normalization
- Data compression

## License

MIT
