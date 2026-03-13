/**
 * Polygon WebSocket client — options trade + quote stream.
 * Handles auth, subscription, reconnection, and event dispatch.
 *
 * Usage:
 *   const ws = new PolygonOptionsWS({ onTrade, onQuote, onError });
 *   ws.connect();
 *   ws.subscribe(["O:AAPL*", "O:NVDA*"]);
 */

import WebSocket from "ws";
import type { PolygonWsOptionTrade, PolygonWsOptionQuote } from "@/types/polygon";

export interface PolygonWSOpts {
  onTrade?: (trade: PolygonWsOptionTrade) => void;
  onQuote?: (quote: PolygonWsOptionQuote) => void;
  onConnected?: () => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

const WS_URL = process.env.POLYGON_WS_URL ?? "wss://socket.polygon.io/options";
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class PolygonOptionsWS {
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(private opts: PolygonWSOpts) {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(WS_URL);
    this.ws.on("open", () => this.onOpen());
    this.ws.on("message", (data: WebSocket.RawData) => this.onMessage(data));
    this.ws.on("error", (err: Error) => this.opts.onError?.(err));
    this.ws.on("close", () => this.onClose());
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
  }

  subscribe(tickers: string[]) {
    tickers.forEach((t) => this.subscriptions.add(t));
    if (this.ws?.readyState === WebSocket.OPEN) {
      const subs = tickers.map((t) => `T.${t}`).concat(tickers.map((t) => `Q.${t}`));
      this.send({ action: "subscribe", params: subs.join(",") });
    }
  }

  unsubscribe(tickers: string[]) {
    tickers.forEach((t) => this.subscriptions.delete(t));
    if (this.ws?.readyState === WebSocket.OPEN) {
      const subs = tickers.map((t) => `T.${t}`).concat(tickers.map((t) => `Q.${t}`));
      this.send({ action: "unsubscribe", params: subs.join(",") });
    }
  }

  private send(obj: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private onOpen() {
    this.reconnectAttempts = 0;
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) throw new Error("POLYGON_API_KEY missing");
    this.send({ action: "auth", params: apiKey });

    // Keepalive ping every 30s
    this.pingInterval = setInterval(() => this.send({ action: "ping" }), 30_000);
  }

  private onMessage(raw: WebSocket.RawData) {
    let messages: Array<{ ev: string; [k: string]: unknown }>;
    try {
      messages = JSON.parse(raw.toString());
      if (!Array.isArray(messages)) messages = [messages];
    } catch {
      return;
    }

    for (const msg of messages) {
      switch (msg.ev) {
        case "connected":
          break;

        case "auth_success":
          this.opts.onConnected?.();
          // Re-subscribe if reconnecting
          if (this.subscriptions.size > 0) {
            this.subscribe(Array.from(this.subscriptions));
          }
          break;

        case "auth_failed":
          this.opts.onError?.(new Error("Polygon auth failed — check POLYGON_API_KEY"));
          break;

        case "T": // Trade
          this.opts.onTrade?.(msg as unknown as PolygonWsOptionTrade);
          break;

        case "Q": // Quote
          this.opts.onQuote?.(msg as unknown as PolygonWsOptionQuote);
          break;
      }
    }
  }

  private onClose() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.opts.onClose?.();

    if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      const delay = RECONNECT_DELAY_MS * Math.min(this.reconnectAttempts, 8);
      setTimeout(() => this.connect(), delay);
    }
  }
}
