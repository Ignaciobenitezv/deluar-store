import { db } from "@/lib/database";
import type { Order } from "@/features/order/types";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  items_json: string;
  subtotal: number;
  total: number;
  customer_json: string;
  shipping_address_json: string;
  created_at: string;
};

const insertOrderStatement = db.prepare(`
  INSERT INTO orders (
    id,
    order_number,
    status,
    items_json,
    subtotal,
    total,
    customer_json,
    shipping_address_json,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectOrderByIdStatement = db.prepare(`
  SELECT
    id,
    order_number,
    status,
    items_json,
    subtotal,
    total,
    customer_json,
    shipping_address_json,
    created_at
  FROM orders
  WHERE id = ?
  LIMIT 1
`);

const listOrdersStatement = db.prepare(`
  SELECT
    id,
    order_number,
    status,
    items_json,
    subtotal,
    total,
    customer_json,
    shipping_address_json,
    created_at
  FROM orders
  ORDER BY created_at DESC
`);

function mapRowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status as Order["status"],
    items: JSON.parse(row.items_json) as Order["items"],
    subtotal: row.subtotal,
    total: row.total,
    customer: JSON.parse(row.customer_json) as Order["customer"],
    shippingAddress: JSON.parse(row.shipping_address_json) as Order["shippingAddress"],
    createdAt: row.created_at,
  };
}

export function saveOrder(order: Order) {
  insertOrderStatement.run(
    order.id,
    order.orderNumber,
    order.status,
    JSON.stringify(order.items),
    order.subtotal,
    order.total,
    JSON.stringify(order.customer),
    JSON.stringify(order.shippingAddress),
    order.createdAt,
  );

  return order;
}

export function getOrderById(id: string) {
  const row = selectOrderByIdStatement.get(id) as OrderRow | undefined;

  return row ? mapRowToOrder(row) : null;
}

export function listOrders() {
  const rows = listOrdersStatement.all() as OrderRow[];

  return rows.map(mapRowToOrder);
}
