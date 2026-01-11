# Data Directory

This directory contains SQLite databases for each stock symbol.

## Structure
```
/data
  ├── ICICIBANK.db    # 1-minute candles for ICICI Bank
  ├── HDFCBANK.db     # 1-minute candles for HDFC Bank
  ├── SBIN.db         # 1-minute candles for SBI
  └── sync-config.json # Sync configuration (future)
```

## Database Schema

Each `.db` file contains:

### `candles_1m` table
- `timestamp` (INTEGER PRIMARY KEY): Unix timestamp (seconds)
- `open` (REAL): Opening price
- `high` (REAL): Highest price
- `low` (REAL): Lowest price
- `close` (REAL): Closing price
- `volume` (REAL): Trading volume

### `sync_meta` table
- `key` (TEXT PRIMARY KEY): Metadata key
- `value` (TEXT): Metadata value

Keys:
- `symbol`: Stock symbol (e.g., "ICICIBANK")
- `last_synced_ts`: Last successful sync timestamp
- `first_available_ts`: Earliest data timestamp
- `last_sync_date`: Human-readable last sync date

## Notes

- **Do NOT commit `.db` files to Git** (they are gitignored)
- Data is fetched from Yahoo Finance
- 1-minute data is stored, higher timeframes are generated on-demand
- Incremental sync keeps data up-to-date
