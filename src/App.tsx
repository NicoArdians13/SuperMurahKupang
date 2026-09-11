import { supabase } from "./lib/supabase";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clipboard,
  Download,
  ImagePlus,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Megaphone,
  Package,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Store,
  Tags,
  Truck,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

type Category = {
  id: number;
  name: string;
  image: string;
};

type Product = {
  id: number;
  product_code?: string | null;
  name: string;
  category: string;
  image: string;
  badge?: string | null;
  retail: string;
  wholesale: string;
  superWholesale: string;
  description?: string | null;
};

type Promotion = {
  id: number;
  image_url: string;
  created_at?: string;
};

type AdminSection = "catalog" | "promotion" | "categories" | "orders";

type OrderItem = {
  id?: string;
  productId: number | null;
  code: string;
  productName: string;
  quantity: number;
  price: number;
};

type Customer = {
  id: string;
  name: string;
  whatsapp: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

type PaymentMethod = "cash" | "transfer" | "qris" | "debit" | "piutang";
type PaymentStatus = "lunas" | "dp" | "belum_bayar" | "piutang";

type StoreOrder = {
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

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
  debit: "Debit",
  piutang: "Piutang",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  lunas: "Lunas",
  dp: "DP",
  belum_bayar: "Belum bayar",
  piutang: "Piutang",
};

const normalizeOrderItem = (item: any): OrderItem => ({
  id: item?.id ? String(item.id) : undefined,
  productId: item?.product_id === null || item?.product_id === undefined
    ? item?.productId === null || item?.productId === undefined ? null : Number(item.productId)
    : Number(item.product_id),
  code: String(item?.product_code ?? item?.code ?? "").trim(),
  productName: String(item?.product_name ?? item?.productName ?? "").trim(),
  quantity: Math.max(0, Number(item?.quantity ?? 0)),
  price: Math.max(0, Number(item?.unit_price ?? item?.price ?? 0)),
});

const normalizeStoreOrder = (row: any): StoreOrder => ({
  id: String(row?.order_number ?? row?.id ?? `TRX-${Date.now().toString(36).toUpperCase()}`),
  databaseId: row?.id ? String(row.id) : undefined,
  storeName: String(row?.store_name ?? row?.customer?.name ?? row?.storeName ?? "").trim(),
  customerId: row?.customer_id ? String(row.customer_id) : null,
  orderDate: String(row?.order_date ?? row?.orderDate ?? localDateString()).slice(0, 10),
  items: Array.isArray(row?.order_items)
    ? row.order_items.map(normalizeOrderItem)
    : Array.isArray(row?.items) ? row.items.map(normalizeOrderItem) : [],
  createdAt: String(row?.created_at ?? row?.createdAt ?? new Date().toISOString()),
  deliveryStatus: row?.delivery_status ?? row?.deliveryStatus ?? "belum_diantar",
  paymentMethod: row?.payment_method ?? "cash",
  paymentStatus: row?.payment_status ?? "belum_bayar",
  dueDate: String(row?.due_date ?? "").slice(0, 10),
  notes: String(row?.notes ?? "").trim(),
});

/* =========================================================
   DEFAULT CATEGORY
========================================================= */

const defaultCategories: { label: string; image: string }[] = [
  {
    label: "Dapur",
    image:
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=85",
  },
  {
    label: "Ruang Tamu",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85",
  },
  {
    label: "Kamar",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85",
  },
  {
    label: "Organisasi",
    image:
      "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=85",
  },
];

/* =========================================================
   EMPTY PRODUCT
========================================================= */

const emptyProduct: Omit<Product, "id"> = {
  product_code: "",
  name: "",
  category: "Dapur",
  retail: "",
  wholesale: "",
  superWholesale: "",
  image: "",
  badge: "",
  description: "",
};

/* =========================================================
   HELPERS
========================================================= */

const priceNumber = (value: string) =>
  Number(String(value || "").replace(/[^0-9]/g, "")) || 0;

const formatRupiah = (value: number) =>
  `Rp${value.toLocaleString("id-ID")}`;

const localDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

/*
 * Normalisasi produk dari database Supabase
 *
 * Supabase:
 *   super_wholesale
 *
 * React:
 *   superWholesale
 */
const normalizeProduct = (product: any): Product => ({
  id: Number.isFinite(Number(product?.id))
    ? Number(product.id)
    : 0,

  product_code:
    product?.product_code === null || product?.product_code === undefined
      ? ""
      : String(product.product_code).trim(),

  name: String(product?.name ?? "").trim(),

  category: String(product?.category ?? "Dapur").trim() || "Dapur",

  image: String(product?.image ?? "").trim(),

  badge:
    product?.badge === null || product?.badge === undefined
      ? ""
      : String(product.badge).trim(),

  retail:
    product?.retail === null || product?.retail === undefined
      ? ""
      : String(product.retail).trim(),

  wholesale:
    product?.wholesale === null || product?.wholesale === undefined
      ? ""
      : String(product.wholesale).trim(),

  superWholesale:
    product?.super_wholesale !== null &&
    product?.super_wholesale !== undefined
      ? String(product.super_wholesale).trim()
      : product?.superWholesale !== null &&
          product?.superWholesale !== undefined
        ? String(product.superWholesale).trim()
        : "",

  description:
    product?.description === null ||
    product?.description === undefined
      ? ""
      : String(product.description).trim(),
});

const normalizeCategory = (category: any): Category => ({
  id: Number(category?.id ?? 0),
  name: String(category?.name ?? "").trim(),
  image: String(category?.image ?? "").trim(),
});

const normalizePromotion = (promotion: any): Promotion => ({
  id: Number(promotion?.id ?? 0),
  image_url: String(promotion?.image_url ?? "").trim(),
  created_at: promotion?.created_at,
});

const getDefaultCategoryImage = (categoryName: string) => {
  const normalizedName = String(categoryName || "")
    .trim()
    .toLowerCase();

  const found = defaultCategories.find(
    (item) => item.label.toLowerCase() === normalizedName,
  );

  return found?.image || defaultCategories[0].image;
};

/* =========================================================
   STORAGE
========================================================= */

const uploadToStorage = async (
  bucket: string,
  file: File,
  folder: string,
) => {
  const extension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const fileName = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  if (!data?.publicUrl) {
    throw new Error("URL gambar tidak berhasil dibuat.");
  }

  return {
    path: fileName,
    publicUrl: data.publicUrl,
  };
};

const removeStorageFileByUrl = async (
  bucket: string,
  url: string,
) => {
  if (
    !url ||
    !url.includes("/storage/v1/object/public/")
  ) {
    return;
  }

  try {
    const marker =
      `/storage/v1/object/public/${bucket}/`;

    const index = url.indexOf(marker);

    if (index === -1) return;

    const path = url.substring(
      index + marker.length,
    );

    if (!path) return;

    const { error } = await supabase.storage
      .from(bucket)
      .remove([decodeURIComponent(path)]);

    if (error) {
      console.warn(
        "File lama tidak berhasil dihapus:",
        error.message,
      );
    }
  } catch (error) {
    console.warn(
      "Gagal menghapus file lama:",
      error,
    );
  }
};

/* =========================================================
   APP
========================================================= */

function App() {
  /* =======================================================
     STATE
  ======================================================= */

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [syncingProducts, setSyncingProducts] =
    useState(false);

  const [productsError, setProductsError] =
    useState("");

  const [promotionsLoading, setPromotionsLoading] =
    useState(true);

  const [activeCategory, setActiveCategory] =
    useState("Semua");

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [adminOpen, setAdminOpen] =
    useState(false);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [loginError, setLoginError] =
    useState("");

  const [loginLoading, setLoginLoading] =
    useState(false);

  const [editing, setEditing] =
    useState<Product | null>(null);

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [categoryName, setCategoryName] =
    useState("");

  const [adminSearch, setAdminSearch] =
    useState("");

  const [publicSearch, setPublicSearch] =
    useState("");

  const [publicPage, setPublicPage] =
    useState(1);

  const [adminSection, setAdminSection] =
    useState<AdminSection>("catalog");

  const [orders, setOrders] = useState<StoreOrder[]>(() => {
    try {
      const saved = localStorage.getItem("supermurah_store_orders");
      return saved ? JSON.parse(saved).map(normalizeStoreOrder) : [];
    } catch {
      return [];
    }
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderStoreName, setOrderStoreName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", whatsapp: "", address: "", notes: "" });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerEditor, setCustomerEditor] = useState({ name: "", whatsapp: "", address: "", notes: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [orderDate, setOrderDate] = useState(localDateString());
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderProductId, setOrderProductId] = useState("");
  const [orderProductSearch, setOrderProductSearch] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStartDate, setOrderStartDate] = useState(() => localDateString(new Date(Date.now() - 30 * 86400000)));
  const [orderEndDate, setOrderEndDate] = useState(localDateString());
  const [selectedReceipt, setSelectedReceipt] = useState<StoreOrder | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("belum_bayar");
  const [dueDate, setDueDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [bestSellerPeriod, setBestSellerPeriod] = useState<"today" | "7days" | "month" | "custom">("today");
  const ordersPerPage = 5;

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<Omit<Product, "id">>(
      emptyProduct,
    );

  const [uploadingProductImage, setUploadingProductImage] =
    useState(false);

  const [uploadingCategoryImage, setUploadingCategoryImage] =
    useState<number | null>(null);

  const [uploadingPromotion, setUploadingPromotion] =
    useState<number | null>(null);

  const [savingProduct, setSavingProduct] =
    useState(false);

  const [savingCategory, setSavingCategory] =
    useState(false);

  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] =
    useState<Record<number, number>>(() => {
      try {
        const savedCart =
          localStorage.getItem(
            "supermurah_cart",
          );

        return savedCart
          ? JSON.parse(savedCart)
          : {};
      } catch (error) {
        console.error(
          "Gagal memuat cart dari localStorage:",
          error,
        );

        return {};
      }
    });

  useEffect(() => {
    try {
      localStorage.setItem(
        "supermurah_cart",
        JSON.stringify(cart),
      );
    } catch (error) {
      console.error(
        "Gagal menyimpan cart:",
        error,
      );
    }
  }, [cart]);

  /* =======================================================
     CONSTANTS
  ======================================================= */

  const storeLogo =
    "/supermurahkupang.png";

  /* =======================================================
     AUTH ADMIN
  ======================================================= */

  const checkAdmin = async () => {
    setCheckingAuth(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsAdmin(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("admin_users")
        .select("id, role")
        .eq("id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error(
          "Gagal memeriksa admin:",
          error,
        );

        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } catch (error) {
      console.error(
        "Error checkAdmin:",
        error,
      );

      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAdmin();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          checkAdmin();
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     LOGIN
  ======================================================= */

  const submitLogin = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setLoginError("");

    if (
      !login.email.trim() ||
      !login.password
    ) {
      setLoginError(
        "Email dan password wajib diisi.",
      );

      return;
    }

    setLoginLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: login.email.trim(),
        password: login.password,
      });

      if (error || !data.user) {
        console.error(
          "Login error:",
          error,
        );

        setLoginError(
          "Email atau password tidak sesuai.",
        );

        return;
      }

      const {
        data: adminData,
        error: adminError,
      } =
        await supabase
          .from("admin_users")
          .select("id, role")
          .eq("id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();

      if (
        adminError ||
        !adminData
      ) {
        await supabase.auth.signOut();

        setLoginError(
          "Akun berhasil login, tetapi tidak memiliki akses admin.",
        );

        setIsAdmin(false);

        return;
      }

      setIsAdmin(true);
      setAdminOpen(true);

      setLogin({
        email: "",
        password: "",
      });
    } catch (error) {
      console.error(
        "Error login:",
        error,
      );

      setLoginError(
        "Terjadi kesalahan saat login.",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = async () => {
    await supabase.auth.signOut();

    setIsAdmin(false);
    setAdminOpen(false);
    setEditorOpen(false);
    setEditing(null);
  };

  /* =======================================================
     LOAD PRODUCTS
     
     INI BAGIAN YANG SAYA PERBAIKI PALING PENTING.
  ======================================================= */

  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError("");

    try {
      const {
        data,
        error,
      } = await supabase
        .from("products")
        .select("*")
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Gagal mengambil products dari Supabase:",
          error,
        );

        setProductsError(
          error.message ||
            "Gagal memuat katalog produk.",
        );

        setProducts([]);

        return;
      }

      const normalizedProducts =
        (data ?? [])
          .map(normalizeProduct)
          .filter(
            (product) =>
              Number.isFinite(product.id) &&
              product.id >= 0 &&
              product.name.trim() !== "",
          );

      console.log(
        "Products berhasil dimuat:",
        normalizedProducts.length,
      );

      console.log(
        "Data products dari Supabase:",
        normalizedProducts,
      );

      setProducts(
        normalizedProducts,
      );
    } catch (error: any) {
      console.error(
        "Exception loadProducts:",
        error,
      );

      setProductsError(
        error?.message ||
          "Terjadi kesalahan saat memuat produk.",
      );

      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  const loadCategories = async () => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("categories")
        .select("*")
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Gagal memuat categories:",
          error,
        );

        return;
      }

      setCategories(
        (data ?? []).map(
          normalizeCategory,
        ),
      );
    } catch (error) {
      console.error(
        "Exception loadCategories:",
        error,
      );
    }
  };

  /* =======================================================
     LOAD PROMOTIONS
  ======================================================= */

  const loadPromotions = async () => {
    setPromotionsLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("promotions")
        .select("*")
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Gagal memuat promotions:",
          error,
        );

        return;
      }

      setPromotions(
        (data ?? []).map(
          normalizePromotion,
        ),
      );
    } catch (error) {
      console.error(
        "Exception loadPromotions:",
        error,
      );
    } finally {
      setPromotionsLoading(false);
    }
  };

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, whatsapp, address, notes, created_at, updated_at")
        .order("name", { ascending: true });

      if (error) {
        if (!/relation .*customers.* does not exist|could not find the table/i.test(error.message)) {
          console.error("Gagal memuat customer:", error);
        }
        return;
      }

      setCustomers((data ?? []).map((customer: any) => ({
        id: String(customer.id),
        name: String(customer.name ?? "").trim(),
        whatsapp: String(customer.whatsapp ?? "").trim(),
        address: String(customer.address ?? "").trim(),
        notes: String(customer.notes ?? "").trim(),
        createdAt: String(customer.created_at ?? new Date().toISOString()),
        updatedAt: String(customer.updated_at ?? customer.created_at ?? new Date().toISOString()),
      })));
    } catch (error: any) {
      setOrderError(error?.message || "Gagal memuat toko.");
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrderError("");
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (!/relation .*orders.* does not exist|could not find the table/i.test(error.message)) {
          setOrderError(error.message);
        }
        return;
      }

      const normalized = (data ?? []).map(normalizeStoreOrder);
      const itemIds = normalized.map((order) => order.databaseId).filter(Boolean);
      if (itemIds.length) {
        const { data: itemRows, error: itemError } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", itemIds);
        if (itemError) throw itemError;
        const itemsByOrder = new Map<string, OrderItem[]>();
        (itemRows ?? []).forEach((item: any) => {
          const orderId = String(item.order_id);
          itemsByOrder.set(orderId, [...(itemsByOrder.get(orderId) ?? []), normalizeOrderItem(item)]);
        });
        normalized.forEach((order) => {
          if (order.databaseId && itemsByOrder.has(order.databaseId)) {
            order.items = itemsByOrder.get(order.databaseId) ?? [];
          }
        });
      }
      setOrders(normalized);
      localStorage.setItem("supermurah_store_orders", JSON.stringify(normalized));
    } catch (error: any) {
      setOrderError(error?.message || "Gagal memuat pesanan.");
    } finally {
      setOrdersLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadPromotions();
    loadCustomers();
    loadOrders();
  }, []);

  /* =======================================================
     REALTIME
  ======================================================= */

  useEffect(() => {
    const productsChannel =
      supabase
        .channel("products-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
          },
          () => {
            console.log(
              "Realtime products berubah. Reload...",
            );

            loadProducts();
          },
        )
        .subscribe((status) => {
          console.log(
            "Products realtime status:",
            status,
          );
        });

    const categoriesChannel =
      supabase
        .channel("categories-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "categories",
          },
          () => {
            loadCategories();
          },
        )
        .subscribe();

    const promotionsChannel =
      supabase
        .channel("promotions-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "promotions",
          },
          () => {
            loadPromotions();
          },
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        productsChannel,
      );

      supabase.removeChannel(
        categoriesChannel,
      );

      supabase.removeChannel(
        promotionsChannel,
      );
    };
  }, []);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const heroPromotion =
    promotions.find(
      (item) => item.id === 1,
    )?.image_url ?? "";

  const lowerPromotion =
    promotions.find(
      (item) => item.id === 2,
    )?.image_url ?? "";

  const categoryNames = useMemo(
    () =>
      categories
        .map((category) =>
          category.name.trim(),
        )
        .filter(Boolean),
    [categories],
  );

  /*
   * Filter kategori dibuat case-insensitive
   * agar "Dapur" dan "dapur" tidak dianggap berbeda.
   */
  const filteredProducts = useMemo(() => {
    if (activeCategory === "Semua") {
      return products;
    }

    const selectedCategory =
      activeCategory
        .trim()
        .toLowerCase();

    return products.filter(
      (product) =>
        product.category
          .trim()
          .toLowerCase() ===
        selectedCategory,
    );
  }, [
    products,
    activeCategory,
  ]);

  /*
   * PENCARIAN PRODUK PUBLIK
   */
  const publicFilteredProducts =
    useMemo(() => {
      const keyword =
        publicSearch
          .trim()
          .toLowerCase();

      if (keyword.length < 2) {
        return filteredProducts;
      }

      return filteredProducts.filter(
        (product) => {
          const searchableText =
            [
              product.name,
              product.category,
              product.description ?? "",
              product.badge ?? "",
            ]
              .join(" ")
              .toLowerCase();

          return searchableText.includes(
            keyword,
          );
        },
      );
    }, [
      filteredProducts,
      publicSearch,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const productsPerPage = 12;

  const totalPublicPages =
    Math.max(
      1,
      Math.ceil(
        publicFilteredProducts.length /
          productsPerPage,
      ),
    );

  /*
   * Pastikan halaman tidak pernah melebihi
   * jumlah halaman yang tersedia.
   */
  const safePublicPage =
    Math.min(
      Math.max(publicPage, 1),
      totalPublicPages,
    );

  const pageWindowStart =
    safePublicPage <= 10
      ? 1
      : safePublicPage % 10 === 0
        ? safePublicPage - 9
        : Math.floor(
            (safePublicPage - 1) /
              10,
          ) *
            10 +
          1;

  const pageWindowEnd =
    Math.min(
      totalPublicPages,
      pageWindowStart + 9,
    );

  const visiblePageNumbers =
    Array.from(
      {
        length:
          pageWindowEnd -
          pageWindowStart +
          1,
      },
      (_, index) =>
        pageWindowStart + index,
    );

  const visibleProducts =
    publicFilteredProducts.slice(
      (safePublicPage - 1) *
        productsPerPage,
      safePublicPage *
        productsPerPage,
    );

  /* =======================================================
     ADMIN SEARCH
  ======================================================= */

  const adminFilteredProducts =
    useMemo(() => {
      const keyword =
        adminSearch
          .trim()
          .toLowerCase();

      if (keyword.length < 2) {
        return products;
      }

      return products.filter(
        (product) =>
          `${product.name} ${product.product_code ?? ""} ${product.category} ${product.description ?? ""}`
            .toLowerCase()
            .includes(keyword),
      );
    }, [
      products,
      adminSearch,
    ]);

  /* =======================================================
     RESET PUBLIC PAGE
  ======================================================= */

  useEffect(() => {
    setPublicPage(1);
  }, [
    activeCategory,
    publicSearch,
  ]);

  useEffect(() => {
    if (
      publicPage >
      totalPublicPages
    ) {
      setPublicPage(
        totalPublicPages,
      );
    }
  }, [
    publicPage,
    totalPublicPages,
  ]);

  /* =======================================================
     CART CALCULATION
  ======================================================= */

  const cartItems =
    products.filter(
      (product) =>
        (cart[product.id] || 0) > 0,
    );

  const totalQuantity =
    Object.values(cart).reduce(
      (total, quantity) =>
        total + quantity,
      0,
    );

  const getPrice = (
    product: Product,
    quantity: number,
  ) => {
    if (quantity >= 36) {
      return priceNumber(
        product.superWholesale,
      );
    }

    if (quantity >= 6) {
      return priceNumber(
        product.wholesale,
      );
    }

    return priceNumber(
      product.retail,
    );
  };

  const selectedOrderProduct = products.find(
    (product) => String(product.id) === orderProductId,
  );

  const orderProductMatches = useMemo(() => {
    const keyword = orderProductSearch.trim().toLowerCase();
    if (keyword.length < 2) return [];

    return products
      .filter((product) => `${product.name} ${product.product_code ?? ""} ${product.category}`.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [products, orderProductSearch]);

  useEffect(() => {
    if (!selectedOrderProduct) return;

    setOrderCode(selectedOrderProduct.product_code ?? "");
    setOrderPrice(String(getPrice(selectedOrderProduct, Number(orderQuantity) || 1)));
  }, [orderProductId, orderQuantity, products]);

  const orderTotal = (order: StoreOrder | { items: OrderItem[] }) =>
    order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orderQuantityTotal = (order: StoreOrder | { items: OrderItem[] }) =>
    order.items.reduce((sum, item) => sum + item.quantity, 0);

  const filteredOrders = useMemo(
    () => orders.filter((order) => {
      const matchesDate = order.orderDate >= orderStartDate && order.orderDate <= orderEndDate;
      const keyword = orderSearch.trim().toLowerCase();
      const matchesSearch = !keyword || `${order.storeName} ${order.id}`.toLowerCase().includes(keyword);
      return matchesDate && matchesSearch;
    }),
    [orders, orderSearch, orderStartDate, orderEndDate],
  );

  const customerMatches = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();
    if (!keyword) return customers.slice(0, 6);
    return customers.filter((customer) => `${customer.name} ${customer.whatsapp} ${customer.address}`.toLowerCase().includes(keyword)).slice(0, 6);
  }, [customers, customerSearch]);

  const bestSellerDates = useMemo(() => {
    const today = localDateString();
    if (bestSellerPeriod === "today") return { start: today, end: today };
    if (bestSellerPeriod === "7days") return { start: localDateString(new Date(Date.now() - 6 * 86400000)), end: today };
    if (bestSellerPeriod === "month") {
      const date = new Date();
      date.setDate(1);
      return { start: localDateString(date), end: today };
    }
    return { start: orderStartDate, end: orderEndDate };
  }, [bestSellerPeriod, orderStartDate, orderEndDate]);

  const bestSellers = useMemo(() => {
    const totals = new Map<string, number>();
    orders
      .filter((order) => order.orderDate >= bestSellerDates.start && order.orderDate <= bestSellerDates.end)
      .flatMap((order) => order.items)
      .forEach((item) => totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity));
    return Array.from(totals.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5);
  }, [orders, bestSellerDates]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = filteredOrders.slice(
    (orderPage - 1) * ordersPerPage,
    orderPage * ordersPerPage,
  );

  useEffect(() => {
    if (orderPage > totalOrderPages) setOrderPage(totalOrderPages);
  }, [orderPage, totalOrderPages]);

  const chartDays = useMemo(() => {
    const days: { date: string; total: number }[] = [];
    const start = new Date(`${orderStartDate}T00:00:00`);
    const end = new Date(`${orderEndDate}T00:00:00`);
    const current = new Date(start);

    while (current <= end && days.length < 31) {
      const date = localDateString(current);
      days.push({
        date,
        total: filteredOrders
          .filter((order) => order.orderDate === date)
          .reduce((sum, order) => sum + orderTotal(order), 0),
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [filteredOrders, orderStartDate, orderEndDate]);

  const saveOrders = (nextOrders: StoreOrder[]) => {
    setOrders(nextOrders);
    localStorage.setItem("supermurah_store_orders", JSON.stringify(nextOrders));
  };

  const createCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert("Nama toko wajib diisi.");
      return;
    }
    const { data, error } = await supabase.from("customers").insert({
      name: newCustomer.name.trim(),
      whatsapp: newCustomer.whatsapp.trim() || null,
      address: newCustomer.address.trim() || null,
      notes: newCustomer.notes.trim() || null,
    }).select("id, name, whatsapp, address, notes, created_at").single();
    if (error || !data) {
      setOrderError(error?.message || "Customer belum berhasil disimpan.");
      alert(error?.message || "Customer belum berhasil disimpan.");
      return;
    }
    const customer: Customer = {
      id: String(data.id),
      name: String(data.name ?? "").trim(),
      whatsapp: String(data.whatsapp ?? "").trim(),
      address: String(data.address ?? "").trim(),
      notes: String(data.notes ?? "").trim(),
      createdAt: String(data.created_at ?? new Date().toISOString()),
    };
    setCustomers((items) => [...items, customer].sort((left, right) => left.name.localeCompare(right.name)));
    setSelectedCustomerId(customer.id);
    setOrderStoreName(customer.name);
    setCustomerSearch(customer.name);
    setNewCustomer({ name: "", whatsapp: "", address: "", notes: "" });
    setNewCustomerOpen(false);
  };

  const openCustomerEditor = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerEditor({
      name: customer.name,
      whatsapp: customer.whatsapp,
      address: customer.address,
      notes: customer.notes,
    });
  };

  const updateCustomer = async () => {
    if (!editingCustomer || !customerEditor.name.trim() || savingCustomer) return;
    setSavingCustomer(true);
    setOrderError("");
    try {
      const { data, error } = await supabase
        .from("customers")
        .update({
          name: customerEditor.name.trim(),
          whatsapp: customerEditor.whatsapp.trim() || null,
          address: customerEditor.address.trim() || null,
          notes: customerEditor.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCustomer.id)
        .select("id, name, whatsapp, address, notes, created_at, updated_at")
        .single();

      if (error || !data) throw new Error(error?.message || "Toko belum berhasil diperbarui.");

      const updated: Customer = {
        id: String(data.id),
        name: String(data.name ?? "").trim(),
        whatsapp: String(data.whatsapp ?? "").trim(),
        address: String(data.address ?? "").trim(),
        notes: String(data.notes ?? "").trim(),
        createdAt: String(data.created_at ?? editingCustomer.createdAt),
        updatedAt: String(data.updated_at ?? new Date().toISOString()),
      };
      setCustomers((items) => items.map((item) => item.id === updated.id ? updated : item));
      if (selectedCustomerId === updated.id) {
        setOrderStoreName(updated.name);
        setCustomerSearch(updated.name);
      }
      setEditingCustomer(null);
    } catch (error: any) {
      setOrderError(error?.message || "Toko belum berhasil diperbarui.");
      alert(`Toko belum berhasil diperbarui.\n\n${error?.message || "Terjadi kesalahan."}`);
    } finally {
      setSavingCustomer(false);
    }
  };

  const startEditOrder = (order: StoreOrder) => {
    setEditingOrderId(order.id);
    setOrderStoreName(order.storeName);
    setSelectedCustomerId(order.customerId ?? "");
    setCustomerSearch(order.storeName);
    setOrderDate(order.orderDate);
    setOrderItems(order.items);
    setPaymentMethod(order.paymentMethod);
    setPaymentStatus(order.paymentStatus);
    setDueDate(order.dueDate);
    setOrderNotes(order.notes);
    setSelectedReceipt(null);
  };

  const resetOrderForm = () => {
    setEditingOrderId(null);
    setOrderStoreName("");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setOrderDate(localDateString());
    setOrderItems([]);
    setOrderProductId("");
    setOrderProductSearch("");
    setOrderQuantity("1");
    setOrderCode("");
    setOrderPrice("");
    setPaymentMethod("cash");
    setPaymentStatus("belum_bayar");
    setDueDate("");
    setOrderNotes("");
  };

  const deleteOrder = async (order: StoreOrder) => {
    if (!window.confirm(`Hapus pesanan ${order.id} dari ${order.storeName}?`)) return;
    const { error } = await supabase.from("orders").delete().eq("order_number", order.id);
    if (error) {
      setOrderError(error.message);
      alert(`Pesanan gagal dihapus.\n\n${error.message}`);
      return;
    }
    saveOrders(orders.filter((item) => item.id !== order.id));
    if (editingOrderId === order.id) resetOrderForm();
  };

  const updateOrderStatus = async (order: StoreOrder, deliveryStatus: StoreOrder["deliveryStatus"]) => {
    const { error } = await supabase.from("orders").update({ delivery_status: deliveryStatus }).eq("order_number", order.id);
    if (error) {
      setOrderError(error.message);
      alert(`Status pesanan gagal diperbarui.\n\n${error.message}`);
      return;
    }
    saveOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryStatus } : item));
  };

  const addOrderItem = () => {
    if (!selectedOrderProduct || (Number(orderQuantity) || 0) < 1 || priceNumber(orderPrice) < 1) {
      alert("Pilih barang, isi qty, dan pastikan harga lebih dari 0.");
      return;
    }

    const nextItem = {
      productId: selectedOrderProduct.id,
      code: orderCode.trim() || selectedOrderProduct.product_code || "",
      productName: selectedOrderProduct.name,
      quantity: Number(orderQuantity),
      price: priceNumber(orderPrice),
    };
    setOrderItems((items) => {
      const existing = items.findIndex((item) => item.productId === nextItem.productId);
      if (existing === -1) return [...items, nextItem];
      return items.map((item, index) => index === existing
        ? { ...item, quantity: item.quantity + nextItem.quantity, price: nextItem.price }
        : item);
    });
    setOrderProductId("");
    setOrderProductSearch("");
    setOrderQuantity("1");
    setOrderCode("");
    setOrderPrice("");
  };

  const saveOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (savingOrder) return;
    if (!orderStoreName.trim() || !orderItems.length) {
      alert("Isi nama toko dan tambahkan minimal satu barang.");
      return;
    }
    if (orderItems.some((item) => item.quantity <= 0 || item.price < 0)) {
      alert("Qty harus lebih dari 0 dan harga tidak boleh negatif.");
      return;
    }
    if (paymentMethod === "piutang" && !dueDate) {
      alert("Tanggal jatuh tempo wajib diisi untuk pembayaran piutang.");
      return;
    }

    setSavingOrder(true);
    const wasEditing = Boolean(editingOrderId);
    const existingOrder = editingOrderId ? orders.find((item) => item.id === editingOrderId) : undefined;
    const nextPaymentStatus = paymentMethod === "piutang" ? "piutang" : paymentStatus;
    let itemsForSave = orderItems;
    if (!wasEditing) {
      const productIds = Array.from(new Set(orderItems.map((item) => item.productId).filter((id): id is number => id !== null)));
      const { data: latestProducts, error: latestProductsError } = await supabase
        .from("products")
        .select("id, product_code, name, category, image, retail, wholesale, super_wholesale, badge, description")
        .in("id", productIds);
      if (latestProductsError) {
        setOrderError(latestProductsError.message);
        alert(`Harga terbaru gagal dimuat. Pesanan belum disimpan.\n\n${latestProductsError.message}`);
        setSavingOrder(false);
        return;
      }
      const latestById = new Map((latestProducts ?? []).map((product: any) => [Number(product.id), normalizeProduct(product)]));
      if (latestById.size !== productIds.length) {
        setOrderError("Ada produk pesanan yang sudah tidak tersedia di Supabase.");
        alert("Ada produk pesanan yang sudah tidak tersedia di Supabase. Pesanan belum disimpan.");
        setSavingOrder(false);
        return;
      }
      itemsForSave = orderItems.map((item) => {
        const latest = latestById.get(item.productId as number)!;
        return {
          ...item,
          code: latest.product_code || "",
          productName: latest.name,
          price: getPrice(latest, item.quantity),
        };
      });
    }
    const order: StoreOrder = {
      id: editingOrderId || `TRX-${Date.now().toString(36).toUpperCase()}`,
      storeName: orderStoreName.trim(),
      customerId: selectedCustomerId || null,
      orderDate,
      items: itemsForSave,
      createdAt: existingOrder?.createdAt || new Date().toISOString(),
      deliveryStatus: existingOrder?.deliveryStatus || "belum_diantar",
      paymentMethod,
      paymentStatus: nextPaymentStatus,
      dueDate: paymentMethod === "piutang" ? dueDate : "",
      notes: orderNotes.trim(),
    };

    const orderPayload = {
      order_number: order.id,
      order_date: order.orderDate,
      customer_id: order.customerId,
      store_name: order.storeName,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      due_date: order.dueDate || null,
      subtotal: orderTotal(order),
      grand_total: orderTotal(order),
      notes: order.notes || null,
      delivery_status: order.deliveryStatus,
      items: order.items,
      total: orderTotal(order),
    };
    let databaseOrderId = existingOrder?.databaseId;
    let orderErrorMessage = "";
    if (wasEditing) {
      const { data, error } = await supabase.from("orders").update(orderPayload).eq("order_number", order.id).select("id").maybeSingle();
      databaseOrderId = data?.id ? String(data.id) : databaseOrderId;
      orderErrorMessage = error?.message ?? "";
    } else {
      const { data, error } = await supabase.from("orders").insert(orderPayload).select("id").single();
      databaseOrderId = data?.id ? String(data.id) : databaseOrderId;
      orderErrorMessage = error?.message ?? "";
    }
    if (orderErrorMessage) {
      setOrderError(orderErrorMessage);
      alert(`Pesanan belum tersimpan ke Supabase: ${orderErrorMessage}`);
      setSavingOrder(false);
      return;
    }
    if (!databaseOrderId) {
      const message = "Supabase tidak mengembalikan ID pesanan.";
      setOrderError(message);
      alert(message);
      setSavingOrder(false);
      return;
    }
    const { error: deleteItemsError } = await supabase.from("order_items").delete().eq("order_id", databaseOrderId);
    if (deleteItemsError) {
      setOrderError(deleteItemsError.message);
      alert(`Item pesanan belum tersimpan.\n\n${deleteItemsError.message}`);
      setSavingOrder(false);
      return;
    }
    const { error: insertItemsError } = await supabase.from("order_items").insert(order.items.map((item) => ({
        order_id: databaseOrderId,
        product_id: item.productId,
        product_name: item.productName,
        product_code: item.code,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.quantity * item.price,
      })));
    if (insertItemsError) {
      setOrderError(insertItemsError.message);
      alert(`Item pesanan belum tersimpan.\n\n${insertItemsError.message}`);
      setSavingOrder(false);
      return;
    }
    const savedOrder = { ...order, databaseId: databaseOrderId };
    saveOrders(wasEditing ? orders.map((item) => item.id === order.id ? savedOrder : item) : [savedOrder, ...orders]);

    setSelectedReceipt(savedOrder);
    resetOrderForm();
    setSavingOrder(false);
    alert(wasEditing ? "Pesanan berhasil diperbarui." : "Pesanan berhasil dicatat.");
  };

  const createReceiptBlob = async (order: StoreOrder) => {
    const width = 760;
    const lineHeight = 30;
    const height = 220 + order.items.length * lineHeight + 150;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.fillStyle = "#f8f6ef";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#26332c";
    context.font = "700 30px DM Sans, sans-serif";
    context.fillText("SUPER MURAH KUPANG", 48, 55);
    context.font = "16px DM Sans, sans-serif";
    context.fillStyle = "#69716b";
    context.fillText("NOTA PESANAN TOKO", 48, 84);
    context.fillText(`No. ${order.id}`, 48, 125);
    context.fillText(`Toko: ${order.storeName}`, 48, 151);
    context.fillText(`Tanggal: ${new Date(`${order.orderDate}T00:00:00`).toLocaleDateString("id-ID")}`, 48, 177);
    context.strokeStyle = "#dce0d7";
    context.beginPath();
    context.moveTo(48, 198);
    context.lineTo(width - 48, 198);
    context.stroke();

    let y = 235;
    context.font = "600 15px DM Sans, sans-serif";
    context.fillStyle = "#26332c";
    order.items.forEach((item) => {
      context.fillText(`${item.code}  ${item.productName}`, 48, y);
      context.textAlign = "right";
      context.fillText(`${item.quantity} x ${formatRupiah(item.price)} = ${formatRupiah(item.price * item.quantity)}`, width - 48, y);
      context.textAlign = "left";
      y += lineHeight;
    });
    context.strokeStyle = "#dce0d7";
    context.beginPath();
    context.moveTo(48, y + 8);
    context.lineTo(width - 48, y + 8);
    context.stroke();
    context.font = "700 22px DM Sans, sans-serif";
    context.fillText(`Total ${formatRupiah(orderTotal(order))}`, 48, y + 52);
    context.font = "14px DM Sans, sans-serif";
    context.fillStyle = "#69716b";
    context.fillText(`${orderQuantityTotal(order)} barang - Terima kasih sudah berbelanja.`, 48, y + 88);

    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const downloadReceipt = async (order: StoreOrder) => {
    const blob = await createReceiptBlob(order);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${order.id}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyReceipt = async (order: StoreOrder) => {
    const blob = await createReceiptBlob(order);
    if (!blob || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      alert("Browser ini belum mendukung salin gambar. Gunakan tombol download.");
      return;
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    alert("Nota berhasil disalin sebagai gambar.");
  };

  /* =======================================================
     CART ACTIONS
  ======================================================= */

  const addToCart = (
    product: Product,
  ) => {
    setCart((items) => ({
      ...items,
      [product.id]:
        (items[product.id] || 0) +
        1,
    }));
  };

  const changeCartQuantity = (
    id: number,
    quantity: number,
  ) => {
    setCart((items) => {
      const next = {
        ...items,
      };

      if (
        quantity <= 0 ||
        Number.isNaN(quantity)
      ) {
        delete next[id];
      } else {
        next[id] = quantity;
      }

      return next;
    });
  };

  /* =======================================================
     WHATSAPP
  ======================================================= */

  const whatsapp = () => {
    window.open(
      "https://wa.me/6285755463065?text=Halo%20SUPER%20MURAH%20KUPANG%2C%20saya%20ingin%20bertanya%20tentang%20produk.",
      "_blank",
    );
  };

  /* =======================================================
     CHECKOUT
  ======================================================= */

  const checkout = () => {
    if (!cartItems.length) {
      return;
    }

    const lines =
      cartItems.map((product) => {
        const quantity =
          cart[product.id];

        const unitPrice =
          getPrice(
            product,
            quantity,
          );

        return `- ${product.name} (${quantity} pcs) x ${formatRupiah(unitPrice)} = ${formatRupiah(unitPrice * quantity)}`;
      });

    const total =
      cartItems.reduce(
        (sum, product) =>
          sum +
          getPrice(
            product,
            cart[product.id],
          ) *
            cart[product.id],
        0,
      );

    const tier =
      cartItems.some(
        (product) =>
          (cart[product.id] || 0) >=
          36,
      )
        ? "Harga dihitung per produk (ada produk super grosir)"
        : cartItems.some(
              (product) =>
                (cart[product.id] ||
                  0) >= 6,
            )
          ? "Harga dihitung per produk (ada produk grosir)"
          : "Harga ecer";

    const message =
      `Halo SUPER MURAH KUPANG, saya ingin checkout:\n\n` +
      `${lines.join("\n")}\n\n` +
      `Total barang: ${totalQuantity} pcs\n` +
      `Kategori harga: ${tier}\n` +
      `Total belanja: ${formatRupiah(total)}\n\n` +
      `Nama pemesan: `;

    window.open(
      `https://wa.me/6285755463065?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  /* =======================================================
     PRODUCT EDITOR
  ======================================================= */

  const openEditor = (
    product?: Product,
  ) => {
    setEditing(
      product ?? null,
    );

    if (product) {
      setForm({
        product_code: product.product_code || "",
        name: product.name,
        category:
          product.category,
        retail:
          product.retail,
        wholesale:
          product.wholesale,
        superWholesale:
          product.superWholesale,
        image:
          product.image,
        badge:
          product.badge || "",
        description:
          product.description || "",
      });
    } else {
      setForm({
        ...emptyProduct,
        category:
          categoryNames[0] ||
          "Dapur",
      });
    }

    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditing(null);

    setForm({
      ...emptyProduct,
      category:
        categoryNames[0] ||
        "Dapur",
    });

    setEditorOpen(false);
  };

  /* =======================================================
     UPLOAD PRODUCT IMAGE
  ======================================================= */

  const uploadProductImage =
    async (
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (
        !file ||
        !file.type.startsWith(
          "image/",
        )
      ) {
        return;
      }

      setUploadingProductImage(
        true,
      );

      try {
        const result =
          await uploadToStorage(
            "product-images",
            file,
            "products",
          );

        setForm((current) => ({
          ...current,
          image:
            result.publicUrl,
        }));
      } catch (error: any) {
        console.error(
          "Upload gambar produk:",
          error,
        );

        alert(
          `Gambar produk gagal diupload.\n\n${error?.message || "Unknown error"}`,
        );
      } finally {
        setUploadingProductImage(
          false,
        );
      }
    };

  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  const saveProduct = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const name =
      form.name.trim();

    const category =
      form.category.trim();

    const image =
      form.image.trim();

    if (!name) {
      alert(
        "Nama produk wajib diisi.",
      );

      return;
    }

    if (!category) {
      alert(
        "Kategori produk wajib dipilih.",
      );

      return;
    }

    if (!image) {
      alert(
        "Gambar produk wajib diupload.",
      );

      return;
    }

    setSavingProduct(true);

    try {
      const payload = {
        product_code: form.product_code?.trim() || null,
        name,
        category,
        retail:
          form.retail.trim(),
        wholesale:
          form.wholesale.trim(),
        super_wholesale:
          form.superWholesale.trim(),
        image,
        badge:
          form.badge?.trim() ||
          null,
        description:
          form.description?.trim() ||
          null,
        updated_at: new Date().toISOString(),
      };

      console.log(
        "Payload product:",
        payload,
      );

      let savedProductData: any = null;

      /* ===================================================
         UPDATE
      =================================================== */

      if (editing) {
        const {
          data,
          error,
        } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();

        if (error) {
          console.error(
            "Update product gagal:",
            error,
          );

          alert(
            `Gagal menyimpan perubahan:\n\n${error.message}`,
          );

          return;
        }

        console.log(
          "Product berhasil diupdate:",
          data,
        );

        savedProductData = data;

        if (
          editing.image &&
          editing.image !== image
        ) {
          await removeStorageFileByUrl(
            "product-images",
            editing.image,
          );
        }
      }

      /* ===================================================
         INSERT
      =================================================== */

      else {
        const {
          data,
          error,
        } = await supabase
          .from("products")
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error(
            "Insert product gagal:",
            error,
          );

          alert(
            `Gagal menambah produk baru:\n\n${error.message}`,
          );

          return;
        }

        console.log(
          "Product berhasil ditambahkan:",
          data,
        );

        savedProductData = data;
      }

      /*
       * Update React state langsung dari row hasil Supabase.
       * Dengan begitu produk baru/editan langsung terlihat tanpa
       * menunggu realtime atau refresh halaman.
       */
      if (savedProductData) {
        const normalizedSaved = normalizeProduct(savedProductData);

        setProducts((current) => {
          const exists = current.some(
            (product) => product.id === normalizedSaved.id,
          );

          if (exists) {
            return current.map((product) =>
              product.id === normalizedSaved.id
                ? normalizedSaved
                : product,
            );
          }

          return [...current, normalizedSaved].sort(
            (a, b) => a.id - b.id,
          );
        });
      }

      /*
       * Tetap reload dari database agar state kembali sinkron penuh.
       */
      await loadProducts();

      /*
       * Jika SELECT belum melihat row baru karena timing/RLS,
       * pertahankan row hasil operasi terakhir di state.
       */
      if (savedProductData) {
        const normalizedSaved = normalizeProduct(savedProductData);

        setProducts((current) => {
          const exists = current.some(
            (product) => product.id === normalizedSaved.id,
          );

          if (exists) {
            return current.map((product) =>
              product.id === normalizedSaved.id
                ? normalizedSaved
                : product,
            );
          }

          return [...current, normalizedSaved].sort(
            (a, b) => a.id - b.id,
          );
        });
      }

      /*
       * Tutup editor setelah data berhasil disimpan.
       */
      closeEditor();
    } catch (error: any) {
      console.error(
        "Exception saveProduct:",
        error,
      );

      alert(
        `Terjadi kesalahan:\n\n${error?.message || "Unknown error"}`,
      );
    } finally {
      setSavingProduct(false);
    }
  };

  /* =======================================================
     DELETE PRODUCT
  ======================================================= */

  const removeProduct = async (
    product: Product,
  ) => {
    const confirmed =
      window.confirm(
        `Hapus produk "${product.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) {
        console.error(
          "Delete product gagal:",
          error,
        );

        alert(
          `Produk gagal dihapus:\n\n${error.message}`,
        );

        return;
      }

      if (product.image) {
        await removeStorageFileByUrl(
          "product-images",
          product.image,
        );
      }

      await loadProducts();

      changeCartQuantity(
        product.id,
        0,
      );

      if (
        editing?.id ===
        product.id
      ) {
        closeEditor();
      }
    } catch (error: any) {
      console.error(
        "Exception removeProduct:",
        error,
      );

      alert(
        `Terjadi kesalahan:\n\n${error?.message || "Unknown error"}`,
      );
    }
  };

  /* =======================================================
     ADD CATEGORY
  ======================================================= */

  const addCategory = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const name =
      categoryName.trim();

    if (!name) {
      return;
    }

    const duplicate =
      categories.some(
        (category) =>
          category.name
            .trim()
            .toLowerCase() ===
          name.toLowerCase(),
      );

    if (duplicate) {
      alert(
        "Kategori tersebut sudah ada.",
      );

      return;
    }

    setSavingCategory(true);

    try {
      const {
        error,
      } = await supabase
        .from("categories")
        .insert({
          name,
          image:
            getDefaultCategoryImage(
              name,
            ),
        });

      if (error) {
        console.error(
          "Tambah kategori gagal:",
          error,
        );

        alert(
          `Kategori gagal ditambahkan:\n\n${error.message}`,
        );

        return;
      }

      setCategoryName("");

      await loadCategories();
    } finally {
      setSavingCategory(false);
    }
  };

  /* =======================================================
     DELETE CATEGORY
  ======================================================= */

  const removeCategory = async (
    category: Category,
  ) => {
    const used =
      products.some(
        (product) =>
          product.category
            .trim()
            .toLowerCase() ===
          category.name
            .trim()
            .toLowerCase(),
      );

    if (used) {
      alert(
        "Kategori masih digunakan oleh produk.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Hapus kategori "${category.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      console.error(
        "Delete category gagal:",
        error,
      );

      alert(
        `Kategori gagal dihapus:\n\n${error.message}`,
      );

      return;
    }

    if (category.image) {
      await removeStorageFileByUrl(
        "category-images",
        category.image,
      );
    }

    await loadCategories();

    if (
      activeCategory ===
      category.name
    ) {
      setActiveCategory(
        "Semua",
      );
    }
  };

  /* =======================================================
     UPLOAD CATEGORY IMAGE
  ======================================================= */

  const uploadCategoryImage =
    async (
      category: Category,
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (
        !file ||
        !file.type.startsWith(
          "image/",
        )
      ) {
        return;
      }

      setUploadingCategoryImage(
        category.id,
      );

      try {
        const result =
          await uploadToStorage(
            "category-images",
            file,
            `categories/${category.id}`,
          );

        const {
          error,
        } = await supabase
          .from("categories")
          .update({
            image:
              result.publicUrl,
          })
          .eq(
            "id",
            category.id,
          );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (
          category.image &&
          category.image !==
            result.publicUrl
        ) {
          await removeStorageFileByUrl(
            "category-images",
            category.image,
          );
        }

        await loadCategories();
      } catch (error: any) {
        console.error(
          "Upload kategori gagal:",
          error,
        );

        alert(
          `Gambar kategori gagal diproses:\n\n${error?.message || "Unknown error"}`,
        );
      } finally {
        setUploadingCategoryImage(
          null,
        );
      }
    };

  /* =======================================================
     REMOVE CATEGORY IMAGE
  ======================================================= */

  const removeCategoryImage =
    async (
      category: Category,
    ) => {
      const defaultImg =
        getDefaultCategoryImage(
          category.name,
        );

      const {
        error,
      } = await supabase
        .from("categories")
        .update({
          image: defaultImg,
        })
        .eq(
          "id",
          category.id,
        );

      if (error) {
        console.error(
          "Gagal mengganti gambar kategori:",
          error,
        );

        alert(
          `Gagal menghapus gambar kategori:\n\n${error.message}`,
        );

        return;
      }

      if (
        category.image &&
        category.image !== defaultImg
      ) {
        await removeStorageFileByUrl(
          "category-images",
          category.image,
        );
      }

      await loadCategories();
    };

  /* =======================================================
     UPLOAD PROMOTION
  ======================================================= */

  const uploadPromotionImage =
    async (
      promotionId: number,
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (
        !file ||
        !file.type.startsWith(
          "image/",
        )
      ) {
        return;
      }

      setUploadingPromotion(
        promotionId,
      );

      try {
        const oldPromotion =
          promotions.find(
            (item) =>
              item.id ===
              promotionId,
          );

        const result =
          await uploadToStorage(
            "promotion-images",
            file,
            promotionId === 1
              ? "hero"
              : "lower",
          );

        if (oldPromotion) {
          const {
            error,
          } = await supabase
            .from("promotions")
            .update({
              image_url:
                result.publicUrl,
            })
            .eq(
              "id",
              promotionId,
            );

          if (error) {
            throw new Error(
              error.message,
            );
          }

          if (
            oldPromotion.image_url
          ) {
            await removeStorageFileByUrl(
              "promotion-images",
              oldPromotion.image_url,
            );
          }
        } else {
          const {
            error,
          } = await supabase
            .from("promotions")
            .insert({
              id: promotionId,
              image_url:
                result.publicUrl,
            });

          if (error) {
            throw new Error(
              error.message,
            );
          }
        }

        await loadPromotions();
      } catch (error: any) {
        console.error(
          "Upload promotion gagal:",
          error,
        );

        alert(
          `Gambar promosi gagal diproses:\n\n${error?.message || "Unknown error"}`,
        );
      } finally {
        setUploadingPromotion(
          null,
        );
      }
    };

  /* =======================================================
     REMOVE PROMOTION
  ======================================================= */

  const removePromotionImage =
    async (
      promotionId: number,
    ) => {
      const promotion =
        promotions.find(
          (item) =>
            item.id ===
            promotionId,
        );

      if (
        !promotion ||
        !window.confirm(
          "Hapus gambar promosi?",
        )
      ) {
        return;
      }

      const {
        error,
      } = await supabase
        .from("promotions")
        .delete()
        .eq(
          "id",
          promotionId,
        );

      if (error) {
        console.error(
          "Delete promotion gagal:",
          error,
        );

        alert(
          `Gambar promosi gagal dihapus:\n\n${error.message}`,
        );

        return;
      }

      if (promotion.image_url) {
        await removeStorageFileByUrl(
          "promotion-images",
          promotion.image_url,
        );
      }

      await loadPromotions();
    };

  /* =======================================================
     IMPORT EXCEL
  ======================================================= */

  const importExcel = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    // Reset input supaya file Excel yang sama bisa dipilih lagi.
    event.target.value = "";

    if (!file) {
      return;
    }

    setSyncingProducts(true);

    // Nama barang dianggap sama apabila setelah dinormalisasi
    // hasilnya sama, misalnya:
    // "BABY BATH MICKEY"
    // "baby bath mickey"
    // " BABY   BATH MICKEY "
    // semuanya dianggap sebagai barang yang sama.
    const normalizeProductName = (value: unknown) =>
      String(value ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

    const reader = new FileReader();

    reader.onload = async (loadEvent) => {
      try {
        const workbook = XLSX.read(
          loadEvent.target?.result,
          {
            type: "array",
          },
        );

        if (!workbook.SheetNames.length) {
          alert("File Excel tidak memiliki sheet.");
          return;
        }

        const firstSheet =
          workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(firstSheet, {
          defval: "",
        });

        if (!rows.length) {
          alert("File Excel tidak memiliki data.");
          return;
        }

        /* -----------------------------------------------
           NORMALISASI NAMA KOLOM EXCEL
        ------------------------------------------------ */

        const imported = rows
          .map((row) => {
            const values = Object.fromEntries(
              Object.entries(row).map(
                ([key, value]) => [
                  key
                    .toLowerCase()
                    .replace(/[\s_-]/g, ""),
                  value,
                ],
              ),
            );

            return {
              product_code: String(
                values.kodebarang ??
                  values.kode ??
                  values.kodeproduk ??
                  values.sku ??
                  values.productcode ??
                  "",
              ).trim(),
              name: String(
                values.namabarang ??
                  values.nama ??
                  "",
              ).trim(),

              category:
                String(
                  values.kategori ??
                    "Dapur",
                ).trim() || "Dapur",

              retail: String(
                values.hargaecer ??
                  values.ecer ??
                  "",
              ).trim(),

              wholesale: String(
                values.hargagrosir ??
                  values.grosir ??
                  "",
              ).trim(),

              super_wholesale: String(
                values.hargasupergrosir ??
                  values.supergrosir ??
                  "",
              ).trim(),

              image: String(
                values.gambar ??
                  values.image ??
                  "",
              ).trim(),

              badge: String(
                values.badge ??
                  "",
              ).trim(),

              description: String(
                values.deskripsi ??
                  values.description ??
                  "",
              ).trim(),
            };
          })
          .filter(
            (product) =>
              normalizeProductName(product.name) !== "",
          );

        if (!imported.length) {
          alert(
            "Tidak ada produk valid dalam file Excel.",
          );
          return;
        }

        const { data: existingProducts, error: existingProductsError } = await supabase
          .from("products")
          .select("*");

        if (existingProductsError) {
          throw new Error(`Gagal membaca katalog saat import: ${existingProductsError.message}`);
        }

        const existingByCode = new Map<string, any>();
        const existingByName = new Map<string, any>();
        for (const product of existingProducts ?? []) {
          const code = String(product.product_code ?? "").trim().toLowerCase();
          const name = normalizeProductName(product.name);
          if (code && !existingByCode.has(code)) existingByCode.set(code, product);
          if (name && !existingByName.has(name)) existingByName.set(name, product);
        }

        const rowsByKey = new Map<string, (typeof imported)[number]>();
        let duplicateExcel = 0;
        for (const product of imported) {
          const key = product.product_code
            ? `code:${product.product_code.toLowerCase()}`
            : `name:${normalizeProductName(product.name)}`;
          if (rowsByKey.has(key)) duplicateExcel += 1;
          rowsByKey.set(key, product);
        }

        let insertedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const successfulProducts: any[] = [];

        for (const product of rowsByKey.values()) {
          const codeKey = product.product_code.toLowerCase();
          const nameKey = normalizeProductName(product.name);
          const existing = (codeKey && existingByCode.get(codeKey)) || existingByName.get(nameKey);
          const payload = {
            product_code: product.product_code || null,
            name: product.name,
            category: product.category,
            retail: product.retail,
            wholesale: product.wholesale,
            super_wholesale: product.super_wholesale,
            image: product.image,
            badge: product.badge || null,
            description: product.description || null,
            updated_at: new Date().toISOString(),
          };

          const result = existing
            ? await supabase.from("products").update(payload).eq("id", existing.id).select().single()
            : await supabase.from("products").insert(payload).select().single();

          if (result.error || !result.data) {
            failedCount += 1;
            console.error("Produk gagal diimport:", product.name, result.error);
            continue;
          }

          successfulProducts.push(result.data);
          if (existing) updatedCount += 1;
          else insertedCount += 1;
          const saved = result.data;
          const savedCode = String(saved.product_code ?? "").trim().toLowerCase();
          const savedName = normalizeProductName(saved.name);
          if (savedCode) existingByCode.set(savedCode, saved);
          if (savedName) existingByName.set(savedName, saved);
        }

        /* -----------------------------------------------
           TAMBAH KATEGORI BARU

           Hanya kategori dari produk yang benar-benar
           berhasil masuk yang diproses.
        ------------------------------------------------ */

        const insertedForCategories =
          successfulProducts.length
            ? successfulProducts.map(normalizeProduct)
            : [];

        const existingCategoryNames = new Set(
          categories.map((category) =>
            category.name.trim().toLowerCase(),
          ),
        );

        const newCategories = Array.from(
          new Set(
            insertedForCategories.map((product) =>
              product.category.trim(),
            ),
          ),
        ).filter(
          (name) =>
            name &&
            !existingCategoryNames.has(
              name.toLowerCase(),
            ),
        );

        if (newCategories.length) {
          const { error: categoryError } =
            await supabase
              .from("categories")
              .insert(
                newCategories.map((name) => ({
                  name,
                  image:
                    getDefaultCategoryImage(name),
                })),
              );

          if (categoryError) {
            console.warn(
              "Kategori hasil import gagal ditambahkan:",
              categoryError,
            );
          }
        }

        /* -----------------------------------------------
           RELOAD DATA PRODUK
        ------------------------------------------------ */

        await loadProducts();

        /*
         * Fallback state:
         * hasil INSERT langsung dimasukkan ke React state
         * apabila SELECT/realtime belum sempat memperbarui
         * daftar produk.
         */
        if (successfulProducts.length) {
          const normalizedInserted = successfulProducts
            .map(normalizeProduct)
            .filter(
              (product) =>
                normalizeProductName(product.name) !== "",
            );

          setProducts((current) => {
            const byId = new Map(
              current.map((product) => [
                product.id,
                product,
              ]),
            );

            for (const product of normalizedInserted) {
              byId.set(product.id, product);
            }

            return Array.from(byId.values()).sort(
              (a, b) => a.id - b.id,
            );
          });
        }

        await loadCategories();

        /* -----------------------------------------------
           HASIL IMPORT
        ------------------------------------------------ */

        alert(
          [
            "Import Excel selesai!",
            "",
            `Berhasil ditambahkan: ${insertedCount} barang`,
            `Diperbarui: ${updatedCount} barang`,
            `Duplikat Excel: ${duplicateExcel}`,
            `Gagal: ${failedCount}`,
          ].join("\n"),
        );
      } catch (error) {
        console.error(
          "Excel processing error:",
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : "File Excel tidak dapat diproses.";

        alert(
          `Import Excel gagal.\n\n${message}`,
        );
      } finally {
        setSyncingProducts(false);
      }
    };

    reader.onerror = () => {
      setSyncingProducts(false);
      alert("File Excel tidak dapat dibaca.");
    };

    reader.readAsArrayBuffer(file);
  };

  /* =======================================================
     LOGIN INPUT
  ======================================================= */

  const updateLogin = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setLogin(
      (current) => ({
        ...current,
        [event.target.name]:
          event.target.value,
      }),
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main>
      {/* ===================================================
          ANNOUNCEMENT
      =================================================== */}

      <div className="announcement">
        Pusat grosir perabot rumah tangga
        terpercaya di Kupang{" "}
        <ArrowRight size={15} />
      </div>

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <nav className="nav shell">
        <a
          className="brand"
          href="#top"
        >
          <img
            className="store-logo"
            src={storeLogo}
            alt="Logo"
          />

          <span>SUPER</span>{" "}
          MURAH
          <span className="brand-dot">
            .
          </span>

          <small>KUPANG</small>
        </a>

        <div
          className={`nav-links ${
            menuOpen ? "open" : ""
          }`}
        >
          <a
            href="#koleksi"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Koleksi{" "}
            <ChevronDown
              size={15}
            />
          </a>

          <a
            href="#unggulan"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Harga Grosir
          </a>

          <a
            href="#tentang"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Tentang Kami
          </a>
        </div>

        <div className="nav-actions">
          <button
            className="admin-link"
            onClick={() => {
              setAdminOpen(true);
              setLoginError("");
            }}
          >
            <LogIn size={16} />
            Admin
          </button>

          <button
            className="order-btn"
            onClick={whatsapp}
          >
            Pesan via WhatsApp{" "}
            <ArrowRight size={16} />
          </button>

          <button
            className="menu-btn"
            onClick={() =>
              setMenuOpen(
                !menuOpen,
              )
            }
          >
            {menuOpen ? (
              <X />
            ) : (
              <Menu />
            )}
          </button>
        </div>
      </nav>

      {/* ===================================================
          HERO
      =================================================== */}

      <section
        className="hero shell"
        id="top"
      >
        <div className="hero-copy">
          <p className="eyebrow">
            Grosir perabot rumah tangga
            Kupang
          </p>

          <h1>
            Harga super murah,
            <br />
            <em>pilihan</em> serba
            lengkap.
          </h1>

          <p className="hero-text">
            Belanja perabot rumah tangga
            untuk kebutuhan rumah, toko,
            kos, dan usaha Anda. Ada harga
            ecer, grosir, dan super grosir.
          </p>

          <div className="hero-cta">
            <button
              className="primary-btn"
              onClick={() =>
                document
                  .getElementById(
                    "unggulan",
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
            >
              Lihat katalog{" "}
              <ArrowRight size={17} />
            </button>

            <button
              className="play-btn"
              onClick={whatsapp}
            >
              <span>✆</span>
              Tanya stok kami
            </button>
          </div>
        </div>

        <div className="hero-image">
          {promotionsLoading ? (
            <div className="hero-image-loading">
              <span>
                Memuat promosi...
              </span>
            </div>
          ) : heroPromotion ? (
            <img
              src={heroPromotion}
              alt="Promosi"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="hero-image-empty">
              <span>
                Belum ada gambar
                promosi
              </span>
            </div>
          )}

          <div className="hero-note">
            <span className="note-line" />

            <span>
              Harga bersahabat,
              <br />
              stok bersahabat.
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          TRUST BAR
      =================================================== */}

      <section className="trust-bar">
        <div className="shell trust-items">
          <div>
            <strong>3x</strong>
            <span>
              Pilihan harga
              <br />
              sesuai kebutuhan
            </span>
          </div>

          <div>
            <strong>1000+</strong>
            <span>
              Produk siap
              <br />
              dikirim
            </span>
          </div>

          <div>
            <strong>KPG</strong>
            <span>
              Melayani Kupang
              <br />
              dan sekitarnya
            </span>
          </div>

          <div className="trust-quote">
            “Belanja banyak makin hemat,
            <br />
            <em>
              cocok untuk toko dan usaha.
            </em>
            ”
          </div>
        </div>
      </section>

      {/* ===================================================
          CATEGORY
      =================================================== */}

      <section
        className="section shell"
        id="koleksi"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Cari berdasarkan
              kebutuhan
            </p>

            <h2>
              Lengkapi setiap
              <br />
              <em>sudut rumah.</em>
            </h2>
          </div>

          <p className="section-intro">
            Katalog perabot fungsional
            dengan pilihan harga transparan
            untuk pembelian satuan sampai
            besar.
          </p>
        </div>

        <div className="category-grid">
          {categories.map(
            (category, index) => (
              <button
                className={`category-card category-${
                  index % 4
                }`}
                key={category.id}
                onClick={() => {
                  setActiveCategory(
                    category.name,
                  );

                  document
                    .getElementById(
                      "unggulan",
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                    });
                }}
              >
                <img
                  src={
                    category.image ||
                    getDefaultCategoryImage(
                      category.name,
                    )
                  }
                  alt={
                    category.name
                  }
                />

                <span>
                  {category.name}
                </span>

                <ArrowRight
                  size={19}
                />
              </button>
            ),
          )}
        </div>
      </section>

      {/* ===================================================
          FEATURED / PRODUCT CATALOG
      =================================================== */}

      <section
        className="featured section"
        id="unggulan"
      >
        <div className="shell">
          <div className="section-heading featured-heading">
            <div>
              <p className="eyebrow">
                Katalog terbaru
              </p>

              <h2>
                Harga{" "}
                <em>terbaik.</em>
              </h2>
            </div>

            <div className="catalog-actions">
              <label className="public-search catalog-search">
                <Search size={18} />

                <input
                  value={
                    publicSearch
                  }
                  onChange={(e) => {
                    setPublicSearch(
                      e.target.value,
                    );
                  }}
                  placeholder="Cari nama barang..."
                />

                {publicSearch && (
                  <button
                    type="button"
                    onClick={() =>
                      setPublicSearch(
                        "",
                      )
                    }
                  >
                    <X size={14} />
                  </button>
                )}
              </label>

              <div className="filters">
                {[
                  "Semua",
                  ...categoryNames,
                ].map((cat) => (
                  <button
                    className={
                      activeCategory ===
                      cat
                        ? "active"
                        : ""
                    }
                    key={cat}
                    onClick={() =>
                      setActiveCategory(
                        cat,
                      )
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="price-legend">
            <span>
              <i className="retail-dot" />
              Ecer
            </span>

            <span>
              <i className="wholesale-dot" />
              Grosir
            </span>

            <span>
              <i className="super-dot" />
              Super grosir
            </span>
          </div>

          {/* =================================================
              ERROR LOAD PRODUCTS
          ================================================= */}

          {productsError && (
            <div
              style={{
                padding:
                  "16px 20px",
                marginBottom:
                  "20px",
                borderRadius:
                  "10px",
                background:
                  "#fff1f2",
                border:
                  "1px solid #fecdd3",
              }}
            >
              <strong>
                Katalog gagal dimuat.
              </strong>

              <p
                style={{
                  margin:
                    "6px 0 12px",
                }}
              >
                {productsError}
              </p>

              <button
                className="secondary-btn"
                onClick={
                  loadProducts
                }
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* =================================================
              LOADING
          ================================================= */}

          {productsLoading ? (
            <div
              className="empty-catalog"
            >
              Memuat katalog produk...
            </div>
          ) : (
            <>
              <div className="product-grid">
                {visibleProducts.map(
                  (product) => (
                    <article
                      className="product-card"
                      key={
                        product.id
                      }
                    >
                      <div className="product-image">
                        {product.badge && (
                          <span className="badge">
                            {
                              product.badge
                            }
                          </span>
                        )}

                        <button
                          className="product-photo-button"
                          onClick={() =>
                            setSelectedProduct(
                              product,
                            )
                          }
                        >
                          <img
                            src={
                              product.image ||
                              getDefaultCategoryImage(
                                product.category,
                              )
                            }
                            alt={
                              product.name
                            }
                            loading="lazy"
                          />
                        </button>

                        <div className="quantity-controls">
                          <button
                            className="quantity-minus"
                            onClick={() =>
                              changeCartQuantity(
                                product.id,
                                (cart[
                                  product
                                    .id
                                ] ||
                                  0) -
                                  1,
                              )
                            }
                            disabled={
                              !cart[
                                product.id
                              ]
                            }
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={
                              cart[
                                product.id
                              ] || ""
                            }
                            placeholder="0"
                            onChange={(
                              e,
                            ) =>
                              changeCartQuantity(
                                product.id,
                                parseInt(
                                  e.target
                                    .value,
                                  10,
                                ) || 0,
                              )
                            }
                            style={{
                              width:
                                "35px",
                              textAlign:
                                "center",
                              border:
                                "none",
                              background:
                                "transparent",
                              fontWeight:
                                "bold",
                              fontSize:
                                "14px",
                            }}
                          />

                          <button
                            className="quick-view"
                            onClick={() =>
                              addToCart(
                                product,
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="product-info">
                        <div>
                          <p className="product-category">
                            {
                              product.category
                            }
                          </p>

                          <h3>
                            {
                              product.name
                            }
                          </h3>
                        </div>

                        <div className="price-stack">
                          <strong>
                            {formatRupiah(
                              getPrice(
                                product,
                                cart[
                                  product
                                    .id
                                ] || 0,
                              ),
                            )}
                          </strong>

                          <span>
                            {
                              product.wholesale
                            }{" "}
                            grosir
                          </span>

                          <span>
                            {
                              product.superWholesale
                            }{" "}
                            super
                          </span>
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>

              {publicFilteredProducts.length ===
                0 && (
                <p className="empty-catalog">
                  {publicSearch.trim()
                    ? `Produk "${publicSearch.trim()}" tidak ditemukan.`
                    : "Produk tidak ditemukan."}
                </p>
              )}

              {totalPublicPages > 1 && (
                <nav className="pagination">
                  <button
                    onClick={() =>
                      setPublicPage(
                        Math.max(
                          1,
                          safePublicPage -
                            1,
                        ),
                      )
                    }
                    disabled={
                      safePublicPage ===
                      1
                    }
                  >
                    ‹
                  </button>

                  {visiblePageNumbers.map(
                    (page) => (
                      <button
                        key={page}
                        className={
                          safePublicPage ===
                          page
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setPublicPage(
                            page,
                          )
                        }
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() =>
                      setPublicPage(
                        Math.min(
                          totalPublicPages,
                          safePublicPage +
                            1,
                        ),
                      )
                    }
                    disabled={
                      safePublicPage ===
                      totalPublicPages
                    }
                  >
                    ›
                  </button>
                </nav>
              )}
            </>
          )}

          {/* =================================================
              CART
          ================================================= */}

          <div className="cart-bar">
            <div>
              <strong>
                {totalQuantity} pcs di
                keranjang
              </strong>

              <span>
                {cartItems.some(
                  (p) =>
                    (cart[
                      p.id
                    ] || 0) >= 36,
                )
                  ? "Harga super grosir aktif"
                  : cartItems.some(
                        (p) =>
                          (cart[
                            p.id
                          ] || 0) >= 6,
                      )
                    ? "Harga grosir aktif"
                    : "Tambah 6 pcs untuk harga grosir"}
              </span>
            </div>

            <strong>
              {formatRupiah(
                cartItems.reduce(
                  (
                    sum,
                    product,
                  ) =>
                    sum +
                    getPrice(
                      product,
                      cart[
                        product.id
                      ],
                    ) *
                      cart[
                        product.id
                      ],
                  0,
                ),
              )}
            </strong>

            <button
              className="primary-btn"
              onClick={checkout}
              disabled={
                !cartItems.length
              }
            >
              Checkout via WhatsApp{" "}
              <MessageCircle
                size={17}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================
          BENEFITS
      =================================================== */}

      <section
        className="benefits shell"
        id="tentang"
      >
        <div className="benefit-photo">
          {promotionsLoading ? (
            <div className="benefit-photo-loading">
              <span>
                Memuat...
              </span>
            </div>
          ) : lowerPromotion ? (
            <img
              src={lowerPromotion}
              alt="Promosi bawah"
              loading="lazy"
            />
          ) : (
            <div className="benefit-photo-empty">
              <span>
                Belum ada gambar
              </span>
            </div>
          )}
        </div>

        <div className="benefit-copy">
          <p className="eyebrow">
            Kenapa SUPER MURAH
            KUPANG?
          </p>

          <h2>
            Belanja mudah,
            <br />
            <em>untung lebih.</em>
          </h2>

          <p>
            Kami membantu rumah tangga,
            pemilik toko, dan pelaku usaha
            mendapatkan perabot berkualitas
            dengan harga yang jelas.
          </p>

          <div className="benefit-list">
            <div>
              <Truck size={21} />

              <span>
                <strong>
                  Pengiriman dari Kupang
                </strong>

                <small>
                  Stok aman dan siap
                  dikirim.
                </small>
              </span>
            </div>

            <div>
              <Package size={21} />

              <span>
                <strong>
                  Harga bertingkat
                </strong>

                <small>
                  Ecer, grosir, sampai
                  super grosir.
                </small>
              </span>
            </div>

            <div>
              <ShieldCheck
                size={21}
              />

              <span>
                <strong>
                  Produk pilihan
                </strong>

                <small>
                  Cocok untuk rumah dan
                  usaha.
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          CLOSING
      =================================================== */}

      <section className="closing">
        <div className="shell closing-inner">
          <p className="eyebrow">
            Mulai belanja hari ini
          </p>

          <h2>
            Harga murah untuk
            <br />
            <em>
              semua kebutuhan.
            </em>
          </h2>

          <button
            className="primary-btn light"
            onClick={whatsapp}
          >
            Konsultasi stok sekarang{" "}
            <MessageCircle size={18} />
          </button>
        </div>
      </section>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="footer">
        <div className="footer-inner shell">
          <div className="footer-col-brand">
            <a
              className="footer-brand"
              href="#top"
            >
              <span>SUPER</span>{" "}
              MURAH
              <span className="brand-dot">
                .
              </span>

              <small>
                KUPANG
              </small>
            </a>

            <p className="footer-description">
              Perabot lengkap, harga super
              murah.
            </p>
          </div>

          <div className="footer-col">
            <span className="footer-label">
              Alamat Toko
            </span>

            <p className="footer-text">
              Jln. Trans-Timor, Km. 10,
              Oesapa, Kupang
            </p>
          </div>

          <div className="footer-col">
            <span className="footer-label">
              WhatsApp
            </span>

            <a
              className="footer-whatsapp"
              href="https://wa.me/6285755463065"
              target="_blank"
              rel="noreferrer"
            >
              085755463065
            </a>
          </div>

          <div className="footer-col">
            <span className="footer-label">
              Ikuti Kami
            </span>

            <div className="footer-social-links">
              <a
                href="https://instagram.com/supermurah_kupang"
                target="_blank"
                rel="noreferrer"
                className="social-link-item"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  width="16"
                  height="16"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="1"
                    fill="currentColor"
                  />
                </svg>

                <span>
                  @supermurah_kupang
                </span>
              </a>

              <a
                href="https://tiktok.com/@super.murah.kupang"
                target="_blank"
                rel="noreferrer"
                className="social-link-item"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  width="16"
                  height="16"
                >
                  <path
                    d="M15 4c.4 2.3 1.8 3.8 4 4v3.1c-1.5 0-2.9-.4-4-1.1V16a5 5 0 1 1-5-5c.4 0 .7 0 1 .1v3.2a2 2 0 1 0 1.8 2V4H15z"
                    fill="currentColor"
                  />
                </svg>

                <span>
                  @super.murah.kupang
                </span>
              </a>
            </div>
          </div>

          <small className="footer-copyright">
            © 2024 SUPER MURAH KUPANG
          </small>
        </div>
      </footer>

      {/* ===================================================
          PRODUCT DETAIL MODAL
      =================================================== */}

      {selectedProduct && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setSelectedProduct(
              null,
            )
          }
        >
          <div
            className="product-detail-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close-modal"
              onClick={() =>
                setSelectedProduct(
                  null,
                )
              }
            >
              <X />
            </button>

            <img
              src={
                selectedProduct.image ||
                getDefaultCategoryImage(
                  selectedProduct.category,
                )
              }
              alt={
                selectedProduct.name
              }
            />

            <div>
              <p className="product-category">
                {
                  selectedProduct.category
                }
              </p>

              <h2>
                {
                  selectedProduct.name
                }
              </h2>

              <p className="detail-description">
                {selectedProduct.description ||
                  "Produk pilihan untuk kebutuhan rumah."}
              </p>

              <div className="detail-price">
                <span>
                  Mulai dari
                </span>

                <strong>
                  {formatRupiah(
                    getPrice(
                      selectedProduct,
                      cart[
                        selectedProduct
                          .id
                      ] || 1,
                    ),
                  )}
                </strong>
              </div>

              <div className="detail-actions">
                <div
                  style={{
                    display:
                      "flex",
                    gap: "10px",
                    alignItems:
                      "center",
                    background:
                      "#f3f4f6",
                    padding:
                      "8px 15px",
                    borderRadius:
                      "8px",
                  }}
                >
                  <button
                    onClick={() =>
                      changeCartQuantity(
                        selectedProduct.id,
                        (cart[
                          selectedProduct
                            .id
                        ] || 0) -
                          1,
                      )
                    }
                    style={{
                      background:
                        "none",
                      border:
                        "none",
                      cursor:
                        "pointer",
                      fontSize:
                        "18px",
                    }}
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={
                      cart[
                        selectedProduct
                          .id
                      ] || ""
                    }
                    placeholder="0"
                    onChange={(
                      e,
                    ) =>
                      changeCartQuantity(
                        selectedProduct.id,
                        parseInt(
                          e.target
                            .value,
                          10,
                        ) || 0,
                      )
                    }
                    style={{
                      width:
                        "40px",
                      textAlign:
                        "center",
                      border:
                        "none",
                      background:
                        "transparent",
                      fontWeight:
                        "bold",
                      fontSize:
                        "16px",
                    }}
                  />

                  <button
                    onClick={() =>
                      addToCart(
                        selectedProduct,
                      )
                    }
                    style={{
                      background:
                        "none",
                      border:
                        "none",
                      cursor:
                        "pointer",
                      fontSize:
                        "18px",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          ADMIN MODAL
      =================================================== */}

      {adminOpen && (
        <div
          className="modal-backdrop"
          onClick={() =>
            !isAdmin &&
            setAdminOpen(false)
          }
        >
          <div
            className={`admin-modal ${
              isAdmin
                ? "dashboard-modal"
                : ""
            }`}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {!isAdmin ? (
              /* ===========================================
                 LOGIN
              =========================================== */

              <form
                onSubmit={
                  submitLogin
                }
                className="login-panel"
              >
                <button
                  type="button"
                  className="close-modal"
                  onClick={() =>
                    setAdminOpen(
                      false,
                    )
                  }
                >
                  <X />
                </button>

                <div className="admin-mark">
                  <LogIn />
                </div>

                <p className="eyebrow">
                  Area pengelola
                </p>

                <h2>
                  Login{" "}
                  <em>admin.</em>
                </h2>

                <label>
                  Email admin

                  <input
                    name="email"
                    type="email"
                    value={
                      login.email
                    }
                    onChange={
                      updateLogin
                    }
                    required
                  />
                </label>

                <label>
                  Password

                  <input
                    name="password"
                    type="password"
                    value={
                      login.password
                    }
                    onChange={
                      updateLogin
                    }
                    required
                  />
                </label>

                {loginError && (
                  <div className="login-error">
                    {loginError}
                  </div>
                )}

                <button
                  className="primary-btn login-button"
                  disabled={
                    loginLoading ||
                    checkingAuth
                  }
                >
                  {loginLoading
                    ? "Memeriksa..."
                    : "Masuk ke dashboard"}

                  {!loginLoading && (
                    <ArrowRight
                      size={17}
                    />
                  )}
                </button>
              </form>
            ) : (
              /* ===========================================
                 DASHBOARD
              =========================================== */

              <div className="dashboard">
                <aside className="dashboard-sidebar">
                  <p className="sidebar-label">
                    Menu admin
                  </p>

                  <button
                    className={
                      adminSection ===
                      "catalog"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAdminSection(
                        "catalog",
                      )
                    }
                  >
                    <LayoutDashboard
                      size={17}
                    />
                    Katalog produk
                  </button>

                  <button
                    className={
                      adminSection ===
                      "promotion"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAdminSection(
                        "promotion",
                      )
                    }
                  >
                    <Megaphone
                      size={17}
                    />
                    Halaman promosi
                  </button>

                  <button
                    className={
                      adminSection ===
                      "categories"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setAdminSection(
                        "categories",
                      )
                    }
                  >
                    <Tags size={17} />
                    Kelola kategori
                  </button>

                  <button
                    className={
                      adminSection === "orders"
                        ? "active"
                        : ""
                    }
                    onClick={() => setAdminSection("orders")}
                  >
                    <Receipt size={17} />
                    Pesanan toko
                  </button>
                </aside>

                <div className="dashboard-content">
                  <div className="dashboard-top">
                    <div>
                      <p className="eyebrow">
                        Dashboard admin
                      </p>

                      <h2>
                        {adminSection === "orders" ? (
                          <>Catat <em>pesanan.</em></>
                        ) : (
                          <>Kelola <em>katalog.</em></>
                        )}
                      </h2>
                    </div>

                    <div className="dashboard-actions">
                      {adminSection ===
                        "catalog" && (
                        <>
                          <label className="import-btn">
                            <input
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              onChange={
                                importExcel
                              }
                            />

                            <Package
                              size={16}
                            />

                            Import Excel
                          </label>

                          <button
                            className="secondary-btn"
                            onClick={() =>
                              openEditor()
                            }
                          >
                            <Plus
                              size={16}
                            />
                            Tambah produk
                          </button>
                        </>
                      )}

                      <button
                        className="logout-btn"
                        onClick={
                          logout
                        }
                      >
                        <LogOut
                          size={16}
                        />
                        Keluar
                      </button>

                      <button
                        className="close-modal"
                        onClick={() =>
                          setAdminOpen(
                            false,
                          )
                        }
                      >
                        <X />
                      </button>
                    </div>
                  </div>

                  {/* =====================================
                      ADMIN CATALOG
                  ===================================== */}

                  {adminSection ===
                    "catalog" && (
                    <>
                      <div className="admin-search">
                        <Search
                          size={17}
                        />

                        <input
                          value={
                            adminSearch
                          }
                          onChange={(
                            e,
                          ) =>
                            setAdminSearch(
                              e.target
                                .value,
                            )
                          }
                          placeholder="Cari nama atau kategori barang..."
                        />

                        {adminSearch && (
                          <button
                            type="button"
                            onClick={() =>
                              setAdminSearch(
                                "",
                              )
                            }
                          >
                            <X
                              size={14}
                            />
                          </button>
                        )}
                      </div>

                      <div className="admin-product-list">
                        {adminFilteredProducts.map(
                          (product) => (
                            <div
                              className="admin-product-row"
                              key={
                                product.id
                              }
                            >
                              <img
                                src={
                                  product.image ||
                                  getDefaultCategoryImage(
                                    product.category,
                                  )
                                }
                                alt=""
                              />

                              <div>
                                <strong>
                                  {
                                    product.name
                                  }
                                </strong>

                                {product.product_code && (
                                  <small>Kode: {product.product_code}</small>
                                )}

                                <small>
                                  {
                                    product.retail
                                  }{" "}
                                  /{" "}
                                  {
                                    product.wholesale
                                  }{" "}
                                  /{" "}
                                  {
                                    product.superWholesale
                                  }
                                </small>
                              </div>

                              <select
                                value={
                                  product.category
                                }
                                onChange={async (
                                  e,
                                ) => {
                                  const {
                                    error,
                                  } =
                                    await supabase
                                      .from(
                                        "products",
                                      )
                                      .update(
                                        {
                                          category:
                                            e
                                              .target
                                              .value,
                                        },
                                      )
                                      .eq(
                                        "id",
                                        product.id,
                                      );

                                  if (
                                    error
                                  ) {
                                    console.error(
                                      "Update kategori produk gagal:",
                                      error,
                                    );

                                    alert(
                                      `Gagal mengubah kategori:\n\n${error.message}`,
                                    );

                                    return;
                                  }

                                  await loadProducts();
                                }}
                              >
                                {categoryNames.map(
                                  (
                                    cat,
                                  ) => (
                                    <option
                                      key={
                                        cat
                                      }
                                      value={
                                        cat
                                      }
                                    >
                                      {
                                        cat
                                      }
                                    </option>
                                  ),
                                )}
                              </select>

                              <button
                                className="edit-btn"
                                onClick={() =>
                                  openEditor(
                                    product,
                                  )
                                }
                              >
                                <Pencil
                                  size={
                                    15
                                  }
                                />
                                Edit
                              </button>

                              <button
                                className="delete-btn"
                                onClick={() =>
                                  removeProduct(
                                    product,
                                  )
                                }
                              >
                                <X
                                  size={
                                    16
                                  }
                                />
                              </button>
                            </div>
                          ),
                        )}

                        {!adminFilteredProducts.length && (
                          <p className="empty-catalog">
                            Produk tidak
                            ditemukan.
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {adminSection === "orders" && (
                    <div className="orders-panel">
                      {orderError && <p className="order-error">{orderError}</p>}
                      {ordersLoading && <p className="order-loading">Memuat pesanan...</p>}
                      <div className="order-entry-layout">
                        <form className="order-form" onSubmit={saveOrder}>
                          <div className="order-form-heading">
                            <div>
                              <p className="eyebrow">{editingOrderId ? "Edit pesanan" : "Pesanan baru"}</p>
                              <h3>{editingOrderId ? <>Ubah <em>nota.</em></> : <>Nota <em>toko.</em></>}</h3>
                            </div>
                            <Receipt size={24} />
                          </div>

                          <label>
                            Nama toko
                            <div className="input-with-icon">
                              <Store size={16} />
                              <input value={customerSearch} onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setOrderStoreName(e.target.value);
                                setSelectedCustomerId("");
                              }} placeholder="Cari toko..." required />
                            </div>
                            {customerSearch.trim() && !selectedCustomerId && <div className="customer-results">
                              {customerMatches.map((customer) => <button type="button" key={customer.id} onClick={() => {
                                setSelectedCustomerId(customer.id);
                                setOrderStoreName(customer.name);
                                setCustomerSearch(customer.name);
                              }}><strong>{customer.name}</strong><small>{customer.whatsapp || "Nomor WhatsApp belum diisi"}</small></button>)}
                              {!customerMatches.length && <p>Toko belum ditemukan.</p>}
                            </div>}
                            {selectedCustomerId && customers.find((customer) => customer.id === selectedCustomerId) && (
                              <button type="button" className="new-customer-btn" onClick={() => openCustomerEditor(customers.find((customer) => customer.id === selectedCustomerId) as Customer)}><Pencil size={13} /> Edit toko</button>
                            )}
                            <button type="button" className="new-customer-btn" onClick={() => setNewCustomerOpen((open) => !open)}><Plus size={13} /> Tambah toko baru</button>
                          </label>

                          {newCustomerOpen && <div className="new-customer-form">
                            <label>Nama toko<input value={newCustomer.name} onChange={(e) => setNewCustomer((item) => ({ ...item, name: e.target.value }))} /></label>
                            <label>Nomor WhatsApp<input value={newCustomer.whatsapp} onChange={(e) => setNewCustomer((item) => ({ ...item, whatsapp: e.target.value }))} /></label>
                            <label>Alamat<input value={newCustomer.address} onChange={(e) => setNewCustomer((item) => ({ ...item, address: e.target.value }))} /></label>
                            <label>Catatan customer<textarea value={newCustomer.notes} onChange={(e) => setNewCustomer((item) => ({ ...item, notes: e.target.value }))} /></label>
                            <button type="button" className="secondary-btn" onClick={createCustomer}>Simpan toko</button>
                          </div>}

                          <label>
                            Tanggal pesanan
                            <div className="input-with-icon">
                              <CalendarDays size={16} />
                              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
                            </div>
                          </label>

                          <div className="order-payment-fields">
                            <label>Metode pembayaran<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label>Status pembayaran<select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>{Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                          </div>
                          {paymentMethod === "piutang" && <label>Jatuh tempo<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></label>}
                          <label>Catatan pesanan<textarea className="order-notes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Contoh: Kirim sore" /></label>

                          <div className="order-item-fields">
                            <label className="order-product-picker">
                              Barang
                              <input
                                value={orderProductSearch}
                                onChange={(e) => {
                                  setOrderProductSearch(e.target.value);
                                  if (selectedOrderProduct && e.target.value !== selectedOrderProduct.name) {
                                    setOrderProductId("");
                                  }
                                }}
                                placeholder="Ketik minimal 2 huruf..."
                                autoComplete="off"
                              />
                              {orderProductSearch.trim().length >= 2 && !selectedOrderProduct && (
                                <div className="order-product-results">
                                  {orderProductMatches.map((product) => (
                                    <button
                                      type="button"
                                      key={product.id}
                                      onClick={() => {
                                        setOrderProductId(String(product.id));
                                        setOrderProductSearch(product.name);
                                      }}
                                    >
                                      <span>{product.name}</span>
                                      <small>{product.category}{product.product_code ? ` · ${product.product_code}` : ""} · {formatRupiah(getPrice(product, Number(orderQuantity) || 1))}</small>
                                    </button>
                                  ))}
                                  {!orderProductMatches.length && <p>Tidak ada barang ditemukan.</p>}
                                </div>
                              )}
                            </label>
                            <label>
                              Kode barang
                              <input value={orderCode} onChange={(e) => setOrderCode(e.target.value)} placeholder="Kode barang (opsional)" />
                            </label>
                            <label>
                              Qty
                              <input type="number" min="1" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)} />
                            </label>
                            <label>
                              Harga satuan
                              <input value={orderPrice ? formatRupiah(priceNumber(orderPrice)) : ""} onChange={(e) => setOrderPrice(e.target.value)} placeholder="Rp0" />
                            </label>
                          </div>

                          <button type="button" className="secondary-btn add-order-item" onClick={addOrderItem}>
                            <Plus size={15} /> Tambah barang
                          </button>

                          <div className="order-draft-list">
                            {orderItems.map((item, index) => (
                              <div className="order-draft-row" key={`${item.productId}-${index}`}>
                                <div><strong>{item.productName}</strong><small>{item.code} - {item.quantity} x {formatRupiah(item.price)}</small></div>
                                <strong>{formatRupiah(item.price * item.quantity)}</strong>
                                <button type="button" onClick={() => setOrderItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button>
                              </div>
                            ))}
                            {!orderItems.length && <p className="order-empty">Barang yang ditambahkan akan muncul di sini.</p>}
                          </div>

                          <div className="order-form-total">
                            <span>Total barang <strong>{orderQuantityTotal({ items: orderItems })} pcs</strong></span>
                            <strong>{formatRupiah(orderTotal({ items: orderItems }))}</strong>
                          </div>
                          <button className="primary-btn save-order-btn" disabled={!orderItems.length || savingOrder}>{savingOrder ? "Menyimpan..." : editingOrderId ? "Simpan perubahan" : "Simpan pesanan"} <Receipt size={16} /></button>
                          {editingOrderId && <button type="button" className="secondary-btn cancel-order-edit" onClick={resetOrderForm}>Batal edit</button>}
                        </form>

                          <div className="orders-summary">
                          <div className="summary-heading"><div><p className="eyebrow">Ringkasan</p><h3>Penjualan <em>toko.</em></h3></div><BarChart3 size={23} /></div>
                          <div className="order-filters">
                            <label>Dari<input type="date" value={orderStartDate} onChange={(e) => setOrderStartDate(e.target.value)} /></label>
                            <label>Sampai<input type="date" value={orderEndDate} onChange={(e) => setOrderEndDate(e.target.value)} /></label>
                          </div>
                          <div className="order-metrics">
                            <div><small>Total omzet</small><strong>{formatRupiah(filteredOrders.reduce((sum, order) => sum + orderTotal(order), 0))}</strong></div>
                            <div><small>Pesanan</small><strong>{filteredOrders.length}</strong></div>
                            <div><small>Barang terjual</small><strong>{filteredOrders.reduce((sum, order) => sum + orderQuantityTotal(order), 0)} pcs</strong></div>
                            <div><small>Piutang</small><strong>{formatRupiah(filteredOrders.filter((order) => order.paymentStatus === "piutang").reduce((sum, order) => sum + orderTotal(order), 0))}</strong></div>
                          </div>
                          <div className="best-sellers"><div className="best-sellers-heading"><strong>Produk terlaris</strong><select value={bestSellerPeriod} onChange={(e) => setBestSellerPeriod(e.target.value as typeof bestSellerPeriod)}><option value="today">Hari ini</option><option value="7days">7 hari</option><option value="month">Bulan ini</option><option value="custom">Custom</option></select></div>{bestSellerPeriod === "custom" && <div className="best-seller-dates"><input type="date" value={orderStartDate} onChange={(e) => setOrderStartDate(e.target.value)} /><input type="date" value={orderEndDate} onChange={(e) => setOrderEndDate(e.target.value)} /></div>}{bestSellers.map((item) => <div className="best-seller-row" key={item.name}><span>{item.name}</span><strong>{item.quantity} pcs</strong></div>)}{!bestSellers.length && <p className="order-empty">Belum ada produk terjual pada periode ini.</p>}</div>
                          <div className="sales-chart" aria-label="Grafik omzet harian">
                            {chartDays.map((day) => {
                              const maxTotal = Math.max(...chartDays.map((entry) => entry.total), 1);
                              return <div className="chart-column" key={day.date} title={`${day.date}: ${formatRupiah(day.total)}`}><span style={{ height: `${Math.max((day.total / maxTotal) * 100, day.total ? 8 : 2)}%` }} /><small>{new Date(`${day.date}T00:00:00`).getDate()}</small></div>;
                            })}
                          </div>
                          <div className="order-history-head"><strong>Riwayat pesanan</strong><label className="order-search"><Search size={14} /><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Cari toko..." /></label></div>
                          <div className="order-history">
                            {paginatedOrders.map((order) => <div className="order-history-row" key={order.id}>
                              <div><strong>{order.storeName}</strong><small>{order.id} - {new Date(`${order.orderDate}T00:00:00`).toLocaleDateString("id-ID")}</small><span className={`payment-badge payment-${order.paymentStatus}`}>{paymentStatusLabels[order.paymentStatus]}</span>{order.notes && <small title={order.notes}>Catatan tersedia</small>}</div>
                              <strong>{formatRupiah(orderTotal(order))}</strong>
                              <small className="payment-method">{paymentMethodLabels[order.paymentMethod]}</small>
                              <select className="order-status" value={order.deliveryStatus || "belum_diantar"} onChange={(event) => updateOrderStatus(order, event.target.value as StoreOrder["deliveryStatus"])}>
                                <option value="belum_diantar">Belum diantar</option><option value="diantar">Diantar</option><option value="ambil_sendiri">Diambil sendiri</option>
                              </select>
                              <button className="edit-btn" type="button" onClick={() => startEditOrder(order)}><Pencil size={15} /> Edit</button>
                              <button className="edit-btn" type="button" onClick={() => setSelectedReceipt(order)}><Receipt size={15} /> Nota</button>
                              <button className="delete-btn" type="button" onClick={() => deleteOrder(order)}><X size={15} /></button>
                            </div>)}
                            {!filteredOrders.length && <p className="order-empty">Belum ada pesanan di rentang tanggal ini.</p>}
                          </div>
                          {filteredOrders.length > ordersPerPage && <div className="order-pagination"><button type="button" disabled={orderPage === 1} onClick={() => setOrderPage((page) => page - 1)}>Sebelumnya</button><span>Halaman {orderPage} dari {totalOrderPages}</span><button type="button" disabled={orderPage === totalOrderPages} onClick={() => setOrderPage((page) => page + 1)}>Berikutnya</button></div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =====================================
                      PROMOTION
                  ===================================== */}

                  {adminSection ===
                    "promotion" && (
                    <div className="admin-settings promotion-settings">
                      <div className="settings-copy">
                        <strong>
                          Gambar utama
                        </strong>

                        <small>
                          Hero halaman
                          depan.
                        </small>
                      </div>

                      <label className="settings-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(
                            e,
                          ) =>
                            uploadPromotionImage(
                              1,
                              e,
                            )
                          }
                        />

                        {heroPromotion ? (
                          <img
                            src={
                              heroPromotion
                            }
                            alt="Hero"
                          />
                        ) : (
                          <ImagePlus
                            size={18}
                          />
                        )}

                        <span>
                          {uploadingPromotion ===
                          1
                            ? "Upload..."
                            : "Ganti gambar"}
                        </span>
                      </label>

                      {heroPromotion && (
                        <button
                          className="remove-logo"
                          onClick={() =>
                            removePromotionImage(
                              1,
                            )
                          }
                        >
                          Hapus
                        </button>
                      )}

                      <div
                        className="settings-copy"
                        style={{
                          marginTop:
                            "30px",
                        }}
                      >
                        <strong>
                          Gambar bawah
                        </strong>

                        <small>
                          Foto bawah.
                        </small>
                      </div>

                      <label className="settings-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(
                            e,
                          ) =>
                            uploadPromotionImage(
                              2,
                              e,
                            )
                          }
                        />

                        {lowerPromotion ? (
                          <img
                            src={
                              lowerPromotion
                            }
                            alt="Bawah"
                          />
                        ) : (
                          <ImagePlus
                            size={18}
                          />
                        )}

                        <span>
                          {uploadingPromotion ===
                          2
                            ? "Upload..."
                            : "Ganti gambar"}
                        </span>
                      </label>

                      {lowerPromotion && (
                        <button
                          className="remove-logo"
                          onClick={() =>
                            removePromotionImage(
                              2,
                            )
                          }
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  )}

                  {/* =====================================
                      CATEGORIES
                  ===================================== */}

                  {adminSection ===
                    "categories" && (
                    <div className="category-manager">
                      <form
                        onSubmit={
                          addCategory
                        }
                      >
                        <input
                          value={
                            categoryName
                          }
                          onChange={(
                            e,
                          ) =>
                            setCategoryName(
                              e.target
                                .value,
                            )
                          }
                          placeholder="Nama kategori baru"
                          disabled={
                            savingCategory
                          }
                        />

                        <button
                          className="secondary-btn"
                          disabled={
                            savingCategory
                          }
                        >
                          <Plus
                            size={15}
                          />

                          Tambah
                        </button>
                      </form>

                      <div className="category-editor-grid">
                        {categories.map(
                          (
                            category,
                          ) => (
                            <div
                              className="category-editor-card"
                              key={
                                category.id
                              }
                            >
                              <img
                                src={
                                  category.image ||
                                  getDefaultCategoryImage(
                                    category.name,
                                  )
                                }
                                alt=""
                              />

                              <strong>
                                {
                                  category.name
                                }
                              </strong>

                              <div className="category-editor-actions">
                                <label className="edit-image-btn">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(
                                      e,
                                    ) =>
                                      uploadCategoryImage(
                                        category,
                                        e,
                                      )
                                    }
                                    disabled={
                                      uploadingCategoryImage ===
                                      category.id
                                    }
                                  />

                                  <ImagePlus
                                    size={
                                      14
                                    }
                                  />

                                  Ganti
                                </label>

                                <button
                                  type="button"
                                  className="remove-image-btn"
                                  onClick={() =>
                                    removeCategoryImage(
                                      category,
                                    )
                                  }
                                >
                                  Hapus Gbr
                                </button>

                                <button
                                  type="button"
                                  className="delete-category-btn"
                                  onClick={() =>
                                    removeCategory(
                                      category,
                                    )
                                  }
                                  disabled={products.some(
                                    (
                                      p,
                                    ) =>
                                      p.category
                                        .trim()
                                        .toLowerCase() ===
                                      category.name
                                        .trim()
                                        .toLowerCase(),
                                  )}
                                >
                                  <X
                                    size={
                                      14
                                    }
                                  />

                                  Hapus
                                </button>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setSelectedReceipt(null)}>
          <div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
            <div className="receipt-paper" id="receipt-preview">
              <div className="receipt-brand">SUPER MURAH KUPANG</div>
              <p className="receipt-label">NOTA PESANAN TOKO</p>
              <div className="receipt-meta"><span>No. {selectedReceipt.id}</span><span>{new Date(`${selectedReceipt.orderDate}T00:00:00`).toLocaleDateString("id-ID")}</span></div>
              <strong className="receipt-store">{selectedReceipt.storeName}</strong>
              <div className="receipt-lines">
                {selectedReceipt.items.map((item, index) => <div key={`${item.productId}-${index}`}><div><strong>{item.productName}</strong><small>{item.code} - {item.quantity} x {formatRupiah(item.price)}</small></div><strong>{formatRupiah(item.price * item.quantity)}</strong></div>)}
              </div>
              <div className="receipt-total"><span>Total {orderQuantityTotal(selectedReceipt)} pcs</span><strong>{formatRupiah(orderTotal(selectedReceipt))}</strong></div>
              <p className="receipt-thanks">Terima kasih sudah berbelanja.</p>
            </div>
            <div className="receipt-actions">
              <button className="secondary-btn" onClick={() => copyReceipt(selectedReceipt)}><Clipboard size={15} /> Salin gambar</button>
              <button className="primary-btn" onClick={() => downloadReceipt(selectedReceipt)}><Download size={15} /> Download PNG</button>
              <button className="close-modal" onClick={() => setSelectedReceipt(null)}><X /></button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && editingCustomer && (
        <div className="editor-overlay" onClick={() => setEditingCustomer(null)}>
          <form className="product-editor" onSubmit={(event) => { event.preventDefault(); updateCustomer(); }} onClick={(event) => event.stopPropagation()}>
            <div className="editor-head">
              <div>
                <p className="eyebrow">Master toko</p>
                <h2>Edit toko.</h2>
              </div>
              <button type="button" className="close-modal" onClick={() => setEditingCustomer(null)}><X /></button>
            </div>
            <div className="editor-grid">
              <label>Nama toko<input value={customerEditor.name} onChange={(event) => setCustomerEditor((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label>WhatsApp<input value={customerEditor.whatsapp} onChange={(event) => setCustomerEditor((current) => ({ ...current, whatsapp: event.target.value }))} /></label>
              <label>Alamat<input value={customerEditor.address} onChange={(event) => setCustomerEditor((current) => ({ ...current, address: event.target.value }))} /></label>
              <label>Catatan<textarea value={customerEditor.notes} onChange={(event) => setCustomerEditor((current) => ({ ...current, notes: event.target.value }))} /></label>
            </div>
            <button className="primary-btn" disabled={savingCustomer}>{savingCustomer ? "Menyimpan..." : "Simpan perubahan"}</button>
          </form>
        </div>
      )}

      {/* ===================================================
          PRODUCT EDITOR
      =================================================== */}

      {isAdmin &&
        editorOpen && (
          <div className="editor-overlay">
            <form
              className="product-editor"
              onSubmit={
                saveProduct
              }
            >
              <div className="editor-head">
                <div>
                  <p className="eyebrow">
                    {editing
                      ? "Edit katalog"
                      : "Katalog baru"}
                  </p>

                  <h2>
                    {editing
                      ? "Ubah produk."
                      : "Tambah produk."}
                  </h2>
                </div>

                <button
                  type="button"
                  className="close-modal"
                  onClick={
                    closeEditor
                  }
                >
                  <X />
                </button>
              </div>

              <div className="editor-grid">
                <label>
                  Kode barang

                  <input
                    value={form.product_code || ""}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        product_code: e.target.value,
                      }))
                    }
                    placeholder="Contoh: BRG001"
                  />
                </label>

                <label>
                  Nama produk

                  <input
                    value={
                      form.name
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          name: e
                            .target
                            .value,
                        }),
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Kategori

                  <select
                    value={
                      form.category
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          category:
                            e
                              .target
                              .value,
                        }),
                      )
                    }
                  >
                    {categoryNames.map(
                      (category) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {
                            category
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  Harga ecer

                  <input
                    value={
                      form.retail
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          retail:
                            e
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  Harga grosir

                  <input
                    value={
                      form.wholesale
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          wholesale:
                            e
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  Harga super

                  <input
                    value={
                      form.superWholesale
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          superWholesale:
                            e
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  Label

                  <input
                    value={
                      form.badge ||
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          badge:
                            e
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label className="description-field">
                  Deskripsi

                  <textarea
                    value={
                      form.description ||
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          description:
                            e
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <label className="image-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    uploadProductImage
                  }
                  disabled={
                    uploadingProductImage
                  }
                />

                <span>
                  <ImagePlus
                    size={22}
                  />

                  {uploadingProductImage
                    ? "Mengupload..."
                    : form.image
                      ? "Ganti gambar"
                      : "Upload gambar"}
                </span>

                {form.image && (
                  <img
                    src={
                      form.image
                    }
                    alt="Preview"
                  />
                )}
              </label>

              <button
                className="primary-btn login-button"
                disabled={
                  savingProduct ||
                  uploadingProductImage
                }
              >
                {savingProduct
                  ? "Menyimpan..."
                  : "Simpan katalog"}

                {!savingProduct && (
                  <ArrowRight
                    size={17}
                  />
                )}
              </button>

              {editing && (
                <button
                  type="button"
                  className="delete-product-editor"
                  onClick={() =>
                    removeProduct(
                      editing,
                    )
                  }
                >
                  Hapus produk dari
                  katalog
                </button>
              )}
            </form>
          </div>
        )}
    </main>
  );
}

export default App;