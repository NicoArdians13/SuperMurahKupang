import type { StoreOrder } from "../types";
export function buildSalesReport(orders: StoreOrder[], from: string, to: string) {
  const completed = orders.filter(order => Boolean(order.completedAt) && (!from || order.orderDate >= from) && (!to || order.orderDate <= to));
  const products = new Map<string, { name: string; code: string; quantity: number; revenue: number }>();
  const customers = new Map<string, { name: string; orders: number; revenue: number }>();
  let revenue = 0, quantity = 0, paid = 0;
  for (const order of completed) {
    let total = 0;
    for (const item of order.items) {
      const qty = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
      const price = Number.isFinite(item.price) ? Math.max(0, item.price) : 0;
      const amount = qty * price;
      const key = item.productId != null ? `id:${item.productId}` : item.code.trim() ? `code:${item.code.trim().toLowerCase()}` : `name:${item.productName.trim().toLowerCase()}`;
      const row = products.get(key) ?? { name: item.productName || "Barang tanpa nama", code: item.code, quantity: 0, revenue: 0 };
      row.quantity += qty; row.revenue += amount; products.set(key, row);
      total += amount; quantity += qty;
    }
    revenue += total;
    if (order.paymentStatus === "lunas") paid += total;
    const key = order.customerId ? `id:${order.customerId}` : order.storeName.trim() ? `name:${order.storeName.trim().replace(/\s+/g, " ").toLowerCase()}` : `order:${order.id}`;
    const customer = customers.get(key) ?? { name: order.storeName || "Pelanggan tanpa nama", orders: 0, revenue: 0 };
    customer.orders++; customer.revenue += total; customers.set(key, customer);
  }
  return { completed, revenue, quantity, paid, unpaid: revenue - paid, customerCount: customers.size,
    products: [...products.values()].sort((a,b) => b.quantity-a.quantity || b.revenue-a.revenue || a.name.localeCompare(b.name)),
    customers: [...customers.values()].sort((a,b) => b.orders-a.orders || b.revenue-a.revenue || a.name.localeCompare(b.name)) };
}
