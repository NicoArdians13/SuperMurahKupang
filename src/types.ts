export type Category = {
  id: number;
  name: string;
  image: string;
};

export type Product = {
  id: number;
  product_code?: string | null;
  brand_id?: number | null;
  name: string;
  category: string;
  image: string;
  badge?: string | null;
  retail: string;
  wholesale: string;
  superWholesale: string;
  description?: string | null;
};

export type Promotion = {
  id: number;
  image_url: string;
  created_at?: string;
};

export type AdminSection =
  | "overview"
  | "catalog"
  | "orders"
  | "customers"
  | "marketing"
  | "promotion"
  | "categories"
  | "brands";

export type OrderItem = {
  id?: string;
  productId: number | null;
  code: string;
  productName: string;
  quantity: number;
  price: number;
};

export type Customer = {
  id: string;
  name: string;
  whatsapp: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

export type PaymentMethod = "cash" | "transfer" | "qris" | "debit" | "piutang";
export type PaymentStatus = "lunas" | "dp" | "belum_bayar" | "piutang";

export type StoreOrder = {
  id: string;
  databaseId?: string;
  storeName: string;
  customerId?: string | null;
  orderDate: string;
  items: OrderItem[];
  createdAt: string;
  deliveryStatus: "ambil_sendiri" | "diantar" | "belum_diantar";
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  dueDate: string;
  notes: string;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  location?: string;
};

export type MarketingSettings = {
  announcementActive: boolean;
  announcementText: string;
  promoActive?: boolean;
  heroBadge: string;
  heroHeadingPrimary: string;
  heroHeadingAccent: string;
  heroDescription: string;
  b2bHeading: string;
  b2bDescription: string;
  storeName: string;
  storeAddress: string;
  storeHours: string;
  storePhone: string;
  storeMapsUrl: string;
  whatsappCtaCatalog?: string;
  whatsappCtaWholesale?: string;
  testimonials: Testimonial[];
};

export type AnalyticsEventType =
  | "product_view"
  | "category_click"
  | "search"
  | "search_no_result"
  | "add_to_cart"
  | "checkout"
  | "whatsapp_click"
  | "promotion_click"
  | "wholesale_click";

export type AnalyticsEvent = {
  id: string;
  type: AnalyticsEventType;
  payload: Record<string, any>;
  timestamp: string;
};

