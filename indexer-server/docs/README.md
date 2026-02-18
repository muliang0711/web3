# CrowdfundingPlatform Event Indexer (PoC — Phase 1)

A Proof-of-Concept event indexer for the CrowdfundingPlatform smart contract deployed on Sepolia Testnet. Listens for all contract events via Infura WebSocket, decodes them using ethers.js v6, and outputs structured JSON to the console.

## Prerequisites

- **Node.js** ≥ 18.0.0
- **Infura Account** — [Sign up](https://infura.io/) and create a project for WebSocket access
- **Deployed Contract** — CrowdfundingPlatform contract on Sepolia with known address

## Events Monitored

| Event | Description |
|---|---|
| `CampaignCreated` | New crowdfunding campaign created |
| `CampaignStatusChanged` | Campaign status updated (Active/Funded/Failed) |
| `ContributionReceived` | Contribution made to a campaign |
| `FundsWithdrawn` | Creator withdrew campaign funds |
| `RefundClaimed` | Contributor claimed refund from failed campaign |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Infura project ID and contract address

# 3. Start the indexer (development mode with hot reload)
npm run dev

# OR build and run production
npm run build
npm start
```

## Configuration (.env)

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `INFURA_PROJECT_ID` | ✅ | — | Your Infura project ID |
| `CONTRACT_ADDRESS` | ✅ | — | Deployed contract address on Sepolia |
| `CONFIRMATION_DEPTH` | | `12` | Blocks to wait before processing |
| `BATCH_SIZE` | | `100` | Blocks per batch during catch-up sync |
| `SYNC_START_OFFSET` | | `1000` | Blocks behind head to start when no checkpoint |
| `LOG_LEVEL` | | `info` | Winston log level (error/warn/info/debug) |

## Expected Console Output

When the indexer starts, you'll see:

```
15:30:00 info: ═══════════════════════════════════════════════
15:30:00 info:   CrowdfundingPlatform Event Indexer (PoC)
15:30:00 info: ═══════════════════════════════════════════════
15:30:00 info: Configuration {"contract":"0x1234...","chainId":11155111,...}
15:30:00 info: Connecting to Sepolia via Infura WebSocket... {"url":"wss://sepolia.infura.io/ws/v3/abcd****"}
15:30:01 info: WebSocket connected {"chainId":11155111}
15:30:01 info: Starting catch-up sync {"fromBlock":7500000,"toBlock":7501000,...}
15:30:05 info: Catch-up progress {"progress":"50.0%","processedBlocks":500,...}
```

When an event is decoded, it outputs JSON like:

```json
{
  "eventName": "CampaignCreated",
  "contractAddress": "0x1234...",
  "args": {
    "projectId": "1",
    "creator": "0xabcd...",
    "title": "My Project",
    "goal": "1000000000000000000",
    "deadline": "1735689600",
    "timestamp": "1672531200"
  },
  "blockNumber": 5000123,
  "blockHash": "0x789...",
  "transactionHash": "0xdef...",
  "logIndex": 5,
  "timestamp": 1672531200,
  "confirmations": 12
}
```

## How to Verify It's Working

1. **Check logs**: `logs/combined-YYYY-MM-DD.log` should contain startup and progress messages
2. **Check checkpoint**: `data/state.json` should update with each processed block
3. **Trigger an event**: Interact with your contract on Sepolia — the event should appear in console within ~3 minutes (12 block confirmations × ~15s/block)

## Architecture

```
listener.ts (Orchestrator)
├── ProviderService    — WebSocket connection + reconnect
├── EventDecoderService — ABI-based log parsing
├── CheckpointService  — File-based state persistence
└── DispatchService    — Event output (console → Kafka in Phase 2)
```

**Sync Strategy:**
1. **Catch-up mode**: Fetch historical events in batches of `BATCH_SIZE` blocks
2. **Live mode**: Subscribe to new blocks, process after `CONFIRMATION_DEPTH` confirmations
3. **Reorg handling**: Detect via parent hash mismatch, rollback checkpoint to safe depth

## Manual Test Checklist

- [ ] **Fresh start**: Delete `data/state.json`, run `npm run dev` — should sync last 1000 blocks
- [ ] **Resume from checkpoint**: Stop mid-sync (Ctrl+C), restart — should resume from last checkpoint
- [ ] **Event detection**: Trigger a contract event on Sepolia — should appear within ~3 minutes
- [ ] **Disconnect recovery**: Disconnect internet, wait, reconnect — should auto-reconnect
- [ ] **Checkpoint persistence**: After processing, verify `data/state.json` has updated values

## Troubleshooting

| Issue | Solution |
|---|---|
| `Missing required environment variable` | Copy `.env.example` to `.env` and fill in values |
| `WebSocket error` / repeated reconnects | Check Infura dashboard for rate limits; free tier allows ~10 req/s |
| `429 Too Many Requests` | Indexer auto-backs-off for 60s; consider upgrading Infura plan |
| No events appearing | Verify `CONTRACT_ADDRESS` is correct; ensure contract has emitted events |
| `state.json` corruption | Delete `data/state.json` and restart — will re-sync |
| `ECONNRESET` errors | Network instability; indexer auto-reconnects up to 5 times |

## Phase 2 Preview

Phase 2 will replace the `DispatchService` console output with:
- **Kafka producer** integration (KafkaJS)
- **Topic routing**: `crowdfunding.events.{eventName}`
- **Schema registry**: Avro serialization
- **Dead Letter Queue**: For failed message deliveries

## License

Private — Internal use only.
