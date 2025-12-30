// SQLite database operations using better-sqlite3
// This file handles all database CRUD operations

import Database from 'better-sqlite3';
import path from 'path';
import { ETF, Holding, Trade, CapitalTransaction, Settings, MarketDataRow } from '@/types';
import etfList from '@/data/etf_list.json';

const DB_PATH = path.join(process.cwd(), 'data', 'etf_shop.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase(): void {
  const database = db!;

  // Create tables
  database.exec(`
    -- ETFs table (pre-populated, read-only for users)
    CREATE TABLE IF NOT EXISTS etfs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      yahoo_symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT
    );

    -- Holdings table
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      etf_id INTEGER REFERENCES etfs(id),
      buy_date TEXT NOT NULL,
      buy_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Trades table (completed trades)
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      etf_id INTEGER REFERENCES etfs(id),
      buy_date TEXT NOT NULL,
      sell_date TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      profit REAL NOT NULL,
      profit_percent REAL NOT NULL,
      holding_days INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Capital transactions
    CREATE TABLE IF NOT EXISTS capital_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('ADD', 'WITHDRAW')) NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- SIP entries
    CREATE TABLE IF NOT EXISTS sip_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      etf_id INTEGER REFERENCES etfs(id),
      amount REAL NOT NULL,
      frequency TEXT CHECK(frequency IN ('WEEKLY', 'MONTHLY')) NOT NULL,
      next_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Market data (persisted from Yahoo Finance) - ETF Shop 3.0 with 20 DMA
    CREATE TABLE IF NOT EXISTS market_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      etf_id INTEGER UNIQUE REFERENCES etfs(id),
      cmp REAL NOT NULL,
      high_52w REAL NOT NULL,
      low_52w REAL NOT NULL,
      prev_close REAL,
      change_amount REAL,
      change_percent REAL,
      volume INTEGER,
      dma_20 REAL,
      dma_distance REAL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily activity tracking for buy/sell limits (ETF Shop 3.0)
    CREATE TABLE IF NOT EXISTS daily_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      buy_count INTEGER DEFAULT 0,
      sell_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed ETFs if empty
  const count = database.prepare('SELECT COUNT(*) as count FROM etfs').get() as { count: number };
  if (count.count === 0) {
    const insert = database.prepare(
      'INSERT INTO etfs (symbol, yahoo_symbol, name, category) VALUES (?, ?, ?, ?)'
    );

    const insertMany = database.transaction((etfs: typeof etfList) => {
      for (const etf of etfs) {
        insert.run(etf.symbol, `${etf.symbol}.NS`, etf.name, etf.category);
      }
    });

    insertMany(etfList);
  }

  // Seed default settings if empty - ETF Shop 3.0 defaults
  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      ['profit_target_percent', '3'],         // 3% profit target for LIFO
      ['min_profit_amount', '300'],
      ['per_transaction_amount', '10000'],
      ['total_capital', '500000'],
      ['min_volume', '15000'],                 // Minimum daily volume filter
      ['averaging_threshold', '2.5'],          // 2.5% fall from last price to average
      ['max_daily_buys', '1'],                 // Max 1 buy per day
      ['max_daily_sells', '1'],                // Max 1 sell per day
    ];

    const insertSetting = database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of defaultSettings) {
      insertSetting.run(key, value);
    }
  }
}

export function deleteTrade(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM trades WHERE id = ?').run(id);
}

// ============ ETF Operations ============

export function getAllETFs(): ETF[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, symbol, yahoo_symbol as yahooSymbol, name, category 
    FROM etfs 
    ORDER BY category, symbol
  `).all();
  return rows as ETF[];
}

export function getETFById(id: number): ETF | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, symbol, yahoo_symbol as yahooSymbol, name, category 
    FROM etfs WHERE id = ?
  `).get(id);
  return row as ETF | undefined;
}

export function getETFBySymbol(symbol: string): ETF | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, symbol, yahoo_symbol as yahooSymbol, name, category 
    FROM etfs WHERE symbol = ?
  `).get(symbol);
  return row as ETF | undefined;
}

export function addETF(symbol: string, name: string, category: string): number {
  const db = getDb();
  const yahooSymbol = `${symbol}.NS`;
  const result = db.prepare(`
    INSERT INTO etfs (symbol, yahoo_symbol, name, category)
    VALUES (?, ?, ?, ?)
  `).run(symbol.toUpperCase(), yahooSymbol, name, category);
  return result.lastInsertRowid as number;
}

export function deleteETF(id: number): void {
  const db = getDb();
  // Also delete related market data
  db.prepare('DELETE FROM market_data WHERE etf_id = ?').run(id);
  db.prepare('DELETE FROM etfs WHERE id = ?').run(id);
}

// ============ Holdings Operations ============

export function getAllHoldings(): Holding[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      h.id, h.etf_id as etfId, e.symbol as etfSymbol, e.name as etfName,
      h.buy_date as buyDate, h.buy_price as buyPrice, h.quantity, h.created_at as createdAt
    FROM holdings h
    JOIN etfs e ON h.etf_id = e.id
    ORDER BY h.buy_date DESC
  `).all();
  return rows as Holding[];
}

export function getHoldingsByETF(etfId: number): Holding[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      h.id, h.etf_id as etfId, e.symbol as etfSymbol, e.name as etfName,
      h.buy_date as buyDate, h.buy_price as buyPrice, h.quantity, h.created_at as createdAt
    FROM holdings h
    JOIN etfs e ON h.etf_id = e.id
    WHERE h.etf_id = ?
    ORDER BY h.buy_date ASC
  `).all(etfId);
  return rows as Holding[];
}

export function addHolding(etfId: number, buyDate: string, buyPrice: number, quantity: number): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO holdings (etf_id, buy_date, buy_price, quantity)
    VALUES (?, ?, ?, ?)
  `).run(etfId, buyDate, buyPrice, quantity);
  return result.lastInsertRowid as number;
}

export function updateHolding(id: number, buyPrice: number, quantity: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE holdings SET buy_price = ?, quantity = ? WHERE id = ?
  `).run(buyPrice, quantity, id);
}

export function deleteHolding(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM holdings WHERE id = ?').run(id);
}

// ============ Trade Operations ============

export function getAllTrades(): Trade[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      t.id, t.etf_id as etfId, e.symbol as etfSymbol, e.name as etfName,
      t.buy_date as buyDate, t.sell_date as sellDate,
      t.buy_price as buyPrice, t.sell_price as sellPrice,
      t.quantity, t.profit, t.profit_percent as profitPercent, 
      t.holding_days as holdingDays
    FROM trades t
    JOIN etfs e ON t.etf_id = e.id
    ORDER BY t.sell_date DESC
  `).all();
  return rows as Trade[];
}

export function addTrade(
  etfId: number,
  buyDate: string,
  sellDate: string,
  buyPrice: number,
  sellPrice: number,
  quantity: number
): number {
  const db = getDb();
  const profit = (sellPrice - buyPrice) * quantity;
  const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
  const holdingDays = Math.floor(
    (new Date(sellDate).getTime() - new Date(buyDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const result = db.prepare(`
    INSERT INTO trades (etf_id, buy_date, sell_date, buy_price, sell_price, quantity, profit, profit_percent, holding_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(etfId, buyDate, sellDate, buyPrice, sellPrice, quantity, profit, profitPercent, holdingDays);

  return result.lastInsertRowid as number;
}

// ============ Capital Operations ============

export function getAllCapitalTransactions(): CapitalTransaction[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, type, amount, date, notes
    FROM capital_transactions
    ORDER BY date DESC
  `).all();
  return rows as CapitalTransaction[];
}

export function addCapitalTransaction(
  type: 'ADD' | 'WITHDRAW',
  amount: number,
  date: string,
  notes?: string
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO capital_transactions (type, amount, date, notes)
    VALUES (?, ?, ?, ?)
  `).run(type, amount, date, notes || null);
  return result.lastInsertRowid as number;
}

// ============ Settings Operations ============

export function getSettings(): Settings {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return {
    profitTargetPercent: parseFloat(settings.profit_target_percent) || 6,
    minProfitAmount: parseFloat(settings.min_profit_amount) || 500,
    perTransactionAmount: parseFloat(settings.per_transaction_amount) || 10000,
    totalCapital: parseFloat(settings.total_capital) || 500000,
    minVolume: parseFloat(settings.min_volume) || 15000,
    averagingThreshold: parseFloat(settings.averaging_threshold) || 2.5,
    maxDailyBuys: parseFloat(settings.max_daily_buys) || 1,
    maxDailySells: parseFloat(settings.max_daily_sells) || 1,
  };
}

export function updateSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
}

// ============ SIP Operations ============

export function getAllSIPEntries() {
  const db = getDb();
  return db.prepare(`
    SELECT 
      s.id, s.etf_id as etfId, e.symbol as etfSymbol,
      s.amount, s.frequency, s.next_date as nextDate, s.is_active as isActive
    FROM sip_entries s
    JOIN etfs e ON s.etf_id = e.id
    ORDER BY s.next_date ASC
  `).all();
}

export function addSIPEntry(
  etfId: number,
  amount: number,
  frequency: 'WEEKLY' | 'MONTHLY',
  nextDate: string
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO sip_entries (etf_id, amount, frequency, next_date)
    VALUES (?, ?, ?, ?)
  `).run(etfId, amount, frequency, nextDate);
  return result.lastInsertRowid as number;
}

export function toggleSIPEntry(id: number, isActive: boolean): void {
  const db = getDb();
  db.prepare('UPDATE sip_entries SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

export function deleteSIPEntry(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM sip_entries WHERE id = ?').run(id);
}

// ============ Market Data Operations ============

// MarketDataRow imported from @/types

export function getAllETFsWithMarketData(): MarketDataRow[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      e.id,
      e.id as etfId,
      e.symbol,
      e.yahoo_symbol as yahooSymbol,
      e.name,
      e.category,
      m.cmp,
      m.high_52w as high52w,
      m.low_52w as low52w,
      m.prev_close as prevClose,
      m.change_amount as change,
      m.change_percent as changePercent,
      m.volume,
      m.dma_20 as dma20,
      m.dma_distance as dmaDistance,
      m.updated_at as updatedAt
    FROM etfs e
    LEFT JOIN market_data m ON e.id = m.etf_id
    ORDER BY COALESCE(m.dma_distance, 999999) ASC, e.symbol
  `).all() as MarketDataRow[];

  // Calculate distance from low/high (legacy)
  return rows.map(row => ({
    ...row,
    distanceFromLow: row.cmp && row.low52w && row.low52w > 0
      ? ((row.cmp - row.low52w) / row.low52w) * 100
      : null,
    distanceFromHigh: row.cmp && row.high52w && row.high52w > 0
      ? ((row.high52w - row.cmp) / row.high52w) * 100
      : null,
  }));
}

export function upsertMarketData(
  etfId: number,
  cmp: number,
  high52w: number,
  low52w: number,
  prevClose: number,
  change: number,
  changePercent: number,
  volume: number,
  dma20?: number,
  dmaDistance?: number
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO market_data (etf_id, cmp, high_52w, low_52w, prev_close, change_amount, change_percent, volume, dma_20, dma_distance, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(etf_id) DO UPDATE SET
      cmp = excluded.cmp,
      high_52w = excluded.high_52w,
      low_52w = excluded.low_52w,
      prev_close = excluded.prev_close,
      change_amount = excluded.change_amount,
      change_percent = excluded.change_percent,
      volume = excluded.volume,
      dma_20 = excluded.dma_20,
      dma_distance = excluded.dma_distance,
      updated_at = datetime('now')
  `).run(etfId, cmp, high52w, low52w, prevClose, change, changePercent, volume, dma20 || null, dmaDistance || null);
}

export function getMarketDataLastUpdated(): string | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT MAX(updated_at) as lastUpdated FROM market_data
  `).get() as { lastUpdated: string | null };
  return row?.lastUpdated || null;
}

// ============ Daily Activity Operations ============

export interface DailyActivity {
  id: number;
  date: string;
  buy_count: number;
  sell_count: number;
}

export function getDailyActivity(date: string): DailyActivity | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM daily_activity WHERE date = ?').get(date) as DailyActivity | undefined;
}

export function incrementDailyBuy(date: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO daily_activity (date, buy_count, sell_count)
    VALUES (?, 1, 0)
    ON CONFLICT(date) DO UPDATE SET buy_count = buy_count + 1
  `).run(date);
}

export function incrementDailySell(date: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO daily_activity (date, buy_count, sell_count)
    VALUES (?, 0, 1)
    ON CONFLICT(date) DO UPDATE SET sell_count = sell_count + 1
  `).run(date);
}
