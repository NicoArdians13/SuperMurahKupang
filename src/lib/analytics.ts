import { AnalyticsEvent, AnalyticsEventType } from "../types";

const STORAGE_KEY = "smk_analytics_events";
const MAX_EVENTS = 500;

export function getStoredEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Gagal membaca analytics:", err);
    return [];
  }
}

export function trackEvent(
  type: AnalyticsEventType,
  payload: Record<string, any> = {},
): void {
  try {
    const newEvent: AnalyticsEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    const current = getStoredEvents();
    const updated = [newEvent, ...current].slice(0, MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Gagal merekam event analytics:", err);
  }
}

export interface AnalyticsSummary {
  totalEvents: number;
  todayEventsCount: number;
  topViewedProducts: { id: number; name: string; views: number }[];
  topSearches: { query: string; count: number }[];
  zeroResultSearches: { query: string; count: number }[];
  whatsappClicksByIntent: Record<string, number>;
  cartAdditionsCount: number;
  checkoutCount: number;
  wholesaleClicksCount: number;
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = getStoredEvents();
  const todayStr = new Date().toISOString().slice(0, 10);

  let todayEventsCount = 0;
  let cartAdditionsCount = 0;
  let checkoutCount = 0;
  let wholesaleClicksCount = 0;

  const productViewCounts = new Map<number, { name: string; views: number }>();
  const searchCounts = new Map<string, number>();
  const zeroResultCounts = new Map<string, number>();
  const whatsappClicksByIntent: Record<string, number> = {};

  for (const ev of events) {
    const isToday = ev.timestamp?.slice(0, 10) === todayStr;
    if (isToday) todayEventsCount++;

    switch (ev.type) {
      case "product_view": {
        const pid = Number(ev.payload?.productId);
        const name = String(ev.payload?.productName || `Produk #${pid}`);
        if (pid) {
          const prev = productViewCounts.get(pid) || { name, views: 0 };
          productViewCounts.set(pid, { name, views: prev.views + 1 });
        }
        break;
      }

      case "search": {
        const q = String(ev.payload?.query || "").trim().toLowerCase();
        if (q) {
          searchCounts.set(q, (searchCounts.get(q) || 0) + 1);
        }
        break;
      }

      case "search_no_result": {
        const q = String(ev.payload?.query || "").trim().toLowerCase();
        if (q) {
          zeroResultCounts.set(q, (zeroResultCounts.get(q) || 0) + 1);
        }
        break;
      }

      case "add_to_cart": {
        cartAdditionsCount++;
        break;
      }

      case "checkout": {
        checkoutCount++;
        break;
      }

      case "whatsapp_click": {
        const intent = String(ev.payload?.intent || "general");
        whatsappClicksByIntent[intent] = (whatsappClicksByIntent[intent] || 0) + 1;
        break;
      }

      case "wholesale_click": {
        wholesaleClicksCount++;
        break;
      }

      default:
        break;
    }
  }

  const topViewedProducts = Array.from(productViewCounts.entries())
    .map(([id, info]) => ({ id, name: info.name, views: info.views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const topSearches = Array.from(searchCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const zeroResultSearches = Array.from(zeroResultCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalEvents: events.length,
    todayEventsCount,
    topViewedProducts,
    topSearches,
    zeroResultSearches,
    whatsappClicksByIntent,
    cartAdditionsCount,
    checkoutCount,
    wholesaleClicksCount,
  };
}

export function clearAnalytics(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Gagal membersihkan analytics:", err);
  }
}

