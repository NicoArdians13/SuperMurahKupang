import { supabase } from "./lib/supabase";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
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
  Search,
  ShieldCheck,
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

type AdminSection = "catalog" | "promotion" | "categories";

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

const emptyProduct: Omit<Product, "id"> = {
  name: "",
  category: "Dapur",
  retail: "",
  wholesale: "",
  superWholesale: "",
  image: "",
  badge: "",
  description: "",
};

const priceNumber = (value: string) =>
  Number(String(value || "").replace(/[^0-9]/g, "")) || 0;

const formatRupiah = (value: number) =>
  `Rp${value.toLocaleString("id-ID")}`;

const normalizeProduct = (product: any): Product => ({
  id: Number(product.id),
  name: String(product.name || ""),
  category: String(product.category || "Dapur"),
  image: String(product.image || ""),
  badge: product.badge ?? "",
  retail: String(product.retail || ""),
  wholesale: String(product.wholesale || ""),
  superWholesale: String(product.super_wholesale || product.superWholesale || ""),
  description: product.description ?? "",
});

const normalizeCategory = (category: any): Category => ({
  id: Number(category.id),
  name: String(category.name || ""),
  image: String(category.image || ""),
});

const normalizePromotion = (promotion: any): Promotion => ({
  id: Number(promotion.id),
  image_url: String(promotion.image_url || ""),
  created_at: promotion.created_at,
});

const getDefaultCategoryImage = (categoryName: string) => {
  const found = defaultCategories.find(
    (item) => item.label === categoryName,
  );

  return found?.image || defaultCategories[0].image;
};

/**
 * Upload file ke Supabase Storage.
 *
 * Kita memakai nama file unik supaya tidak terkena masalah
 * duplicate file / overwrite policy.
 */
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

/**
 * Hapus file lama jika URL-nya berasal dari Supabase Storage.
 */
const removeStorageFileByUrl = async (
  bucket: string,
  url: string,
) => {
  if (!url || !url.includes("/storage/v1/object/public/")) {
    return;
  }

  try {
    const marker = `/storage/v1/object/public/${bucket}/`;

    const index = url.indexOf(marker);

    if (index === -1) return;

    const path = url.substring(index + marker.length);

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
    console.warn("Gagal menghapus file lama:", error);
  }
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [activeCategory, setActiveCategory] =
    useState<string>("Semua");

  const [menuOpen, setMenuOpen] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const [categoryName, setCategoryName] = useState("");

  const [adminSearch, setAdminSearch] = useState("");
  const [publicSearch, setPublicSearch] = useState("");

  const [publicPage, setPublicPage] = useState(1);

  const [adminSection, setAdminSection] =
    useState<AdminSection>("catalog");

  const [cart, setCart] =
    useState<Record<number, number>>({});

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<Omit<Product, "id">>(emptyProduct);

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

  const storeLogo = "/supermurahkupang.png";

  /**
   * ---------------------------------------------------------
   * AUTHENTICATION
   * ---------------------------------------------------------
   */

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

      const { data, error } = await supabase
        .from("admin_users")
        .select("id, role")
        .eq("id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Gagal memeriksa admin:", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();

    setLoginError("");

    if (!login.email.trim() || !login.password) {
      setLoginError(
        "Email dan password wajib diisi.",
      );
      return;
    }

    setLoginLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: login.email.trim(),
          password: login.password,
        });

      if (error) {
        console.error("Login error:", error);

        setLoginError(
          "Email atau password tidak sesuai.",
        );

        return;
      }

      if (!data.user) {
        setLoginError(
          "Login gagal. User tidak ditemukan.",
        );
        return;
      }

      /**
       * Login Auth berhasil.
       * Sekarang cek apakah user ini benar-benar admin.
       */
      const { data: adminData, error: adminError } =
        await supabase
          .from("admin_users")
          .select("id, role")
          .eq("id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();

      if (adminError || !adminData) {
        await supabase.auth.signOut();

        setLoginError(
          "Akun berhasil login, tetapi tidak memiliki akses admin.",
        );

        setIsAdmin(false);

        return;
      }

      setIsAdmin(true);
      setLoginError("");
      setAdminOpen(true);
      setLogin({
        email: "",
        password: "",
      });
    } catch (error) {
      console.error(error);

      setLoginError(
        "Terjadi kesalahan saat login. Silakan coba lagi.",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();

    setIsAdmin(false);
    setAdminOpen(false);
    setEditorOpen(false);
    setEditing(null);
  };

  /**
   * ---------------------------------------------------------
   * LOAD PRODUCTS
   * ---------------------------------------------------------
   */

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(
        "Gagal mengambil produk:",
        error,
      );
      return;
    }

    setProducts(
      (data || []).map(normalizeProduct),
    );
  };

  /**
   * ---------------------------------------------------------
   * LOAD CATEGORIES
   * ---------------------------------------------------------
   */

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(
        "Gagal mengambil kategori:",
        error,
      );
      return;
    }

    setCategories(
      (data || []).map(normalizeCategory),
    );
  };

  /**
   * ---------------------------------------------------------
   * LOAD PROMOTIONS
   *
   * ID 1 = gambar hero
   * ID 2 = gambar promosi bawah
   * ---------------------------------------------------------
   */

  const loadPromotions = async () => {
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(
        "Gagal mengambil promosi:",
        error,
      );
      return;
    }

    setPromotions(
      (data || []).map(normalizePromotion),
    );
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadPromotions();
  }, []);

  /**
   * ---------------------------------------------------------
   * REALTIME REFRESH
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const productsChannel = supabase
      .channel("products-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          loadProducts();
        },
      )
      .subscribe();

    const categoriesChannel = supabase
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

    const promotionsChannel = supabase
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
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(promotionsChannel);
    };
  }, []);

  /**
   * ---------------------------------------------------------
   * PROMOTION HELPER
   * ---------------------------------------------------------
   */

  const heroPromotion =
    promotions.find((item) => item.id === 1)
      ?.image_url || "";

  const lowerPromotion =
    promotions.find((item) => item.id === 2)
      ?.image_url || "";

  /**
   * ---------------------------------------------------------
   * CATEGORY
   * ---------------------------------------------------------
   */

  const categoryNames = useMemo(
    () => categories.map((category) => category.name),
    [categories],
  );

  /**
   * ---------------------------------------------------------
   * FILTER PRODUCTS
   * ---------------------------------------------------------
   */

  const filteredProducts =
    activeCategory === "Semua"
      ? products
      : products.filter(
          (product) =>
            product.category === activeCategory,
        );

  const publicFilteredProducts =
    filteredProducts.filter((product) =>
      publicSearch.trim().length < 2
        ? true
        : `${product.name} ${product.category}`
            .toLowerCase()
            .includes(
              publicSearch.trim().toLowerCase(),
            ),
    );

  const productsPerPage = 12;

  const totalPublicPages = Math.max(
    1,
    Math.ceil(
      publicFilteredProducts.length /
        productsPerPage,
    ),
  );

  const pageWindowStart =
    publicPage <= 10
      ? 1
      : publicPage % 10 === 0
        ? publicPage
        : Math.floor(
            (publicPage - 1) / 10,
          ) *
            10 +
          1;

  const pageWindowEnd = Math.min(
    totalPublicPages,
    pageWindowStart + 9,
  );

  const visiblePageNumbers = Array.from(
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
      (publicPage - 1) * productsPerPage,
      publicPage * productsPerPage,
    );

  const adminFilteredProducts =
    adminSearch.trim().length < 2
      ? products
      : products.filter((product) =>
          `${product.name} ${product.category}`
            .toLowerCase()
            .includes(
              adminSearch
                .trim()
                .toLowerCase(),
            ),
        );

  useEffect(() => {
    setPublicPage(1);
  }, [activeCategory, publicSearch]);

  /**
   * ---------------------------------------------------------
   * CART
   * ---------------------------------------------------------
   */

  const cartItems = products.filter(
    (product) =>
      (cart[product.id] || 0) > 0,
  );

  const totalQuantity = Object.values(
    cart,
  ).reduce(
    (total, quantity) =>
      total + quantity,
    0,
  );

  const getPrice = (
    product: Product,
    quantity: number,
  ) =>
    quantity >= 36
      ? priceNumber(product.superWholesale)
      : quantity >= 6
        ? priceNumber(product.wholesale)
        : priceNumber(product.retail);

  const addToCart = (
    product: Product,
  ) =>
    setCart((items) => ({
      ...items,
      [product.id]:
        (items[product.id] || 0) + 1,
    }));

  const changeCartQuantity = (
    id: number,
    quantity: number,
  ) =>
    setCart((items) => {
      const next = { ...items };

      if (quantity <= 0) {
        delete next[id];
      } else {
        next[id] = quantity;
      }

      return next;
    });

  /**
   * ---------------------------------------------------------
   * WHATSAPP
   * ---------------------------------------------------------
   */

  const whatsapp = () =>
    window.open(
      "https://wa.me/6285755463065?text=Halo%20SUPER%20MURAH%20KUPANG%2C%20saya%20ingin%20bertanya%20tentang%20produk.",
      "_blank",
    );

  const checkout = () => {
    if (!cartItems.length) return;

    const lines = cartItems.map(
      (product) => {
        const quantity =
          cart[product.id];

        const unitPrice = getPrice(
          product,
          quantity,
        );

        return `- ${product.name} (${quantity} pcs) x ${formatRupiah(unitPrice)} = ${formatRupiah(unitPrice * quantity)}`;
      },
    );

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
          (cart[product.id] || 0) >= 36,
      )
        ? "Harga dihitung per produk (ada produk super grosir)"
        : cartItems.some(
              (product) =>
                (cart[product.id] || 0) >= 6,
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
      `https://wa.me/6285755463065?text=${encodeURIComponent(
        message,
      )}`,
      "_blank",
    );
  };

  /**
   * ---------------------------------------------------------
   * PRODUCT EDITOR
   * ---------------------------------------------------------
   */

  const openEditor = (
    product?: Product,
  ) => {
    setEditing(product ?? null);

    setForm(
      product
        ? {
            name: product.name,
            category:
              product.category ||
              categoryNames[0] ||
              "Dapur",
            retail: product.retail,
            wholesale:
              product.wholesale,
            superWholesale:
              product.superWholesale,
            image: product.image,
            badge: product.badge || "",
            description:
              product.description || "",
          }
        : {
            ...emptyProduct,
            category:
              categoryNames[0] ||
              "Dapur",
          },
    );

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

  /**
   * ---------------------------------------------------------
   * UPLOAD PRODUCT IMAGE
   * ---------------------------------------------------------
   */

  const uploadProductImage = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "File yang dipilih bukan gambar.",
      );
      return;
    }

    setUploadingProductImage(true);

    try {
      const result =
        await uploadToStorage(
          "product-images",
          file,
          "products",
        );

      setForm((current) => ({
        ...current,
        image: result.publicUrl,
      }));
    } catch (error) {
      console.error(error);

      alert(
        `Gambar produk gagal diupload.\n\n${
          error instanceof Error
            ? error.message
            : "Periksa policy Storage Supabase."
        }`,
      );
    } finally {
      setUploadingProductImage(false);
    }
  };

  /**
   * ---------------------------------------------------------
   * SAVE PRODUCT
   * ---------------------------------------------------------
   */

  const saveProduct = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Nama produk wajib diisi.");
      return;
    }

    if (!form.image) {
      alert(
        "Gambar produk wajib diupload.",
      );
      return;
    }

    if (!form.category) {
      alert(
        "Kategori produk wajib dipilih.",
      );
      return;
    }

    setSavingProduct(true);

    try {
      if (editing) {
        const oldImage =
          editing.image;

        const { error } =
          await supabase
            .from("products")
            .update({
              name: form.name.trim(),
              category: form.category,
              retail: form.retail,
              wholesale:
                form.wholesale,
              super_wholesale:
                form.superWholesale,
              image: form.image,
              badge:
                form.badge?.trim() ||
                null,
              description:
                form.description?.trim() ||
                null,
            })
            .eq("id", editing.id);

        if (error) {
          console.error(error);

          alert(
            `Produk gagal disimpan.\n\n${error.message}`,
          );

          return;
        }

        /**
         * Hapus gambar lama setelah database berhasil di-update.
         */
        if (
          oldImage &&
          oldImage !== form.image
        ) {
          await removeStorageFileByUrl(
            "product-images",
            oldImage,
          );
        }
      } else {
        const { error } =
          await supabase
            .from("products")
            .insert({
              name: form.name.trim(),
              category: form.category,
              retail: form.retail,
              wholesale:
                form.wholesale,
              super_wholesale:
                form.superWholesale,
              image: form.image,
              badge:
                form.badge?.trim() ||
                null,
              description:
                form.description?.trim() ||
                null,
            });

        if (error) {
          console.error(error);

          alert(
            `Produk gagal ditambahkan.\n\n${error.message}`,
          );

          return;
        }
      }

      await loadProducts();
      closeEditor();
    } catch (error) {
      console.error(error);

      alert(
        "Terjadi kesalahan saat menyimpan produk.",
      );
    } finally {
      setSavingProduct(false);
    }
  };

  /**
   * ---------------------------------------------------------
   * DELETE PRODUCT
   * ---------------------------------------------------------
   */

  const removeProduct = async (
    product: Product,
  ) => {
    if (
      !window.confirm(
        `Hapus produk "${product.name}" dari katalog?`,
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

    if (error) {
      console.error(error);

      alert(
        `Produk gagal dihapus.\n\n${error.message}`,
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

    setCart((current) => {
      const next = {
        ...current,
      };

      delete next[product.id];

      return next;
    });

    if (
      editing?.id === product.id
    ) {
      closeEditor();
    }
  };

  /**
   * ---------------------------------------------------------
   * CATEGORY
   * ---------------------------------------------------------
   */

  const addCategory = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const name =
      categoryName.trim();

    if (!name) return;

    const alreadyExists =
      categories.some(
        (category) =>
          category.name.toLowerCase() ===
          name.toLowerCase(),
      );

    if (alreadyExists) {
      alert(
        "Kategori tersebut sudah ada.",
      );
      return;
    }

    setSavingCategory(true);

    try {
      const { error } =
        await supabase
          .from("categories")
          .insert({
            name,
            image:
              getDefaultCategoryImage(
                name,
              ),
          });

      if (error) {
        console.error(error);

        alert(
          `Kategori gagal ditambahkan.\n\n${error.message}`,
        );

        return;
      }

      setCategoryName("");
      await loadCategories();
    } catch (error) {
      console.error(error);

      alert(
        "Terjadi kesalahan saat menambahkan kategori.",
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const removeCategory = async (
    category: Category,
  ) => {
    const usedByProduct =
      products.some(
        (product) =>
          product.category ===
          category.name,
      );

    if (usedByProduct) {
      alert(
        "Kategori tidak dapat dihapus karena masih digunakan oleh produk.",
      );
      return;
    }

    if (
      !window.confirm(
        `Hapus kategori "${category.name}"?`,
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

    if (error) {
      console.error(error);

      alert(
        `Kategori gagal dihapus.\n\n${error.message}`,
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
      setActiveCategory("Semua");
    }
  };

  /**
   * ---------------------------------------------------------
   * CATEGORY IMAGE
   * ---------------------------------------------------------
   */

  const uploadCategoryImage = async (
    category: Category,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "File yang dipilih bukan gambar.",
      );
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

      const oldImage =
        category.image;

      const { error } =
        await supabase
          .from("categories")
          .update({
            image: result.publicUrl,
          })
          .eq("id", category.id);

      if (error) {
        console.error(error);

        /**
         * Kalau database gagal, hapus file baru
         * supaya tidak menjadi file sampah.
         */
        await removeStorageFileByUrl(
          "category-images",
          result.publicUrl,
        );

        alert(
          `Gambar kategori gagal disimpan.\n\n${error.message}`,
        );

        return;
      }

      if (
        oldImage &&
        oldImage !== result.publicUrl
      ) {
        await removeStorageFileByUrl(
          "category-images",
          oldImage,
        );
      }

      await loadCategories();
    } catch (error) {
      console.error(error);

      alert(
        `Gambar kategori gagal diupload.\n\n${
          error instanceof Error
            ? error.message
            : "Periksa policy Storage Supabase."
        }`,
      );
    } finally {
      setUploadingCategoryImage(
        null,
      );
    }
  };

  const removeCategoryImage = async (
    category: Category,
  ) => {
    const defaultImage =
      getDefaultCategoryImage(
        category.name,
      );

    const { error } =
      await supabase
        .from("categories")
        .update({
          image: defaultImage,
        })
        .eq("id", category.id);

    if (error) {
      console.error(error);

      alert(
        `Gambar kategori gagal dihapus.\n\n${error.message}`,
      );

      return;
    }

    if (
      category.image &&
      category.image !== defaultImage
    ) {
      await removeStorageFileByUrl(
        "category-images",
        category.image,
      );
    }

    await loadCategories();
  };

  /**
   * ---------------------------------------------------------
   * PROMOTION IMAGE
   *
   * ID 1 = hero
   * ID 2 = bagian bawah
   * ---------------------------------------------------------
   */

  const uploadPromotionImage = async (
    promotionId: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "File yang dipilih bukan gambar.",
      );
      return;
    }

    setUploadingPromotion(
      promotionId,
    );

    try {
      const result =
        await uploadToStorage(
          "promotion-images",
          file,
          promotionId === 1
            ? "hero"
            : "lower",
        );

      const oldPromotion =
        promotions.find(
          (item) =>
            item.id === promotionId,
        );

      if (oldPromotion) {
        const { error } =
          await supabase
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
          console.error(error);

          await removeStorageFileByUrl(
            "promotion-images",
            result.publicUrl,
          );

          alert(
            `Gambar promosi gagal disimpan.\n\n${error.message}`,
          );

          return;
        }

        if (
          oldPromotion.image_url &&
          oldPromotion.image_url !==
            result.publicUrl
        ) {
          await removeStorageFileByUrl(
            "promotion-images",
            oldPromotion.image_url,
          );
        }
      } else {
        const { error } =
          await supabase
            .from("promotions")
            .insert({
              id: promotionId,
              image_url:
                result.publicUrl,
            });

        if (error) {
          console.error(error);

          await removeStorageFileByUrl(
            "promotion-images",
            result.publicUrl,
          );

          alert(
            `Gambar promosi gagal disimpan.\n\n${error.message}`,
          );

          return;
        }
      }

      await loadPromotions();
    } catch (error) {
      console.error(error);

      alert(
        `Gambar promosi gagal diupload.\n\n${
          error instanceof Error
            ? error.message
            : "Periksa policy Storage Supabase."
        }`,
      );
    } finally {
      setUploadingPromotion(
        null,
      );
    }
  };

  const removePromotionImage = async (
    promotionId: number,
  ) => {
    const promotion =
      promotions.find(
        (item) =>
          item.id === promotionId,
      );

    if (!promotion) return;

    if (
      !window.confirm(
        "Hapus gambar promosi ini?",
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("promotions")
        .delete()
        .eq("id", promotionId);

    if (error) {
      console.error(error);

      alert(
        `Gambar promosi gagal dihapus.\n\n${error.message}`,
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

  /**
   * ---------------------------------------------------------
   * IMPORT EXCEL
   * ---------------------------------------------------------
   */

  const importExcel = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = async (
      loadEvent,
    ) => {
      try {
        const workbook =
          XLSX.read(
            loadEvent.target?.result,
            {
              type: "array",
            },
          );

        const firstSheet =
          workbook.Sheets[
            workbook.SheetNames[0]
          ];

        const rows =
          XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(firstSheet);

        const imported = rows
          .map((row) => {
            const values =
              Object.fromEntries(
                Object.entries(row).map(
                  ([key, value]) => [
                    key
                      .toLowerCase()
                      .replace(
                        /[\s_-]/g,
                        "",
                      ),
                    value,
                  ],
                ),
              );

            return {
              name: String(
                values.namabarang ||
                  values.nama ||
                  "",
              ).trim(),

              category: String(
                values.kategori ||
                  "Dapur",
              ).trim(),

              retail: String(
                values.hargaecer ||
                  values.ecer ||
                  "",
              ),

              wholesale: String(
                values.hargagrosir ||
                  values.grosir ||
                  "",
              ),

              super_wholesale: String(
                values.hargasupergrosir ||
                  values.supergrosir ||
                  "",
              ),

              image: String(
                values.gambar ||
                  values.image ||
                  "",
              ),

              badge: String(
                values.badge ||
                  "",
              ),

              description: String(
                values.deskripsi ||
                  values.description ||
                  "",
              ),
            };
          })
          .filter(
            (product) =>
              product.name,
          );

        if (!imported.length) {
          alert(
            "Tidak ada produk valid yang ditemukan di Excel.",
          );
          return;
        }

        const { error } =
          await supabase
            .from("products")
            .insert(imported);

        if (error) {
          console.error(error);

          alert(
            `Import Excel gagal.\n\n${error.message}`,
          );

          return;
        }

        /**
         * Tambahkan kategori yang belum ada.
         */
        const existingNames =
          new Set(
            categories.map(
              (category) =>
                category.name.toLowerCase(),
            ),
          );

        const newCategories =
          Array.from(
            new Set(
              imported.map(
                (product) =>
                  product.category,
              ),
            ),
          ).filter(
            (name) =>
              !existingNames.has(
                name.toLowerCase(),
              ),
          );

        if (newCategories.length) {
          await supabase
            .from("categories")
            .insert(
              newCategories.map(
                (name) => ({
                  name,
                  image:
                    getDefaultCategoryImage(
                      name,
                    ),
                }),
              ),
            );
        }

        await loadProducts();
        await loadCategories();

        alert(
          `${imported.length} produk berhasil diimport.`,
        );
      } catch (error) {
        console.error(error);

        alert(
          "File Excel tidak dapat diproses.",
        );
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /**
   * ---------------------------------------------------------
   * LOGIN INPUT
   * ---------------------------------------------------------
   */

  const updateLogin = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setLogin((current) => ({
      ...current,
      [event.target.name]:
        event.target.value,
    }));
  };

  /**
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <main>
      <div className="announcement">
        Pusat grosir perabot rumah tangga terpercaya di Kupang{" "}
        <ArrowRight size={15} />
      </div>

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <nav className="nav shell">
        <a
          className="brand"
          href="#top"
          aria-label="SUPER MURAH KUPANG home"
        >
          <img
            className="store-logo"
            src={storeLogo}
            alt="Logo SUPER MURAH KUPANG"
          />

          <span>SUPER</span> MURAH
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
            <ChevronDown size={15} />
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
            <LogIn size={16} /> Admin
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
              setMenuOpen(!menuOpen)
            }
            aria-label="Buka menu"
          >
            {menuOpen ? (
              <X />
            ) : (
              <Menu />
            )}
          </button>
        </div>
      </nav>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section
        className="hero shell"
        id="top"
      >
        <div className="hero-copy">
          <p className="eyebrow">
            Grosir perabot rumah tangga Kupang
          </p>

          <h1>
            Harga super murah,
            <br />
            <em>pilihan</em> serba lengkap.
          </h1>

          <p className="hero-text">
            Belanja perabot rumah tangga untuk
            kebutuhan rumah, toko, kos, dan usaha
            Anda. Ada harga ecer, grosir, dan super
            grosir.
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
              aria-label="Hubungi SUPER MURAH KUPANG"
            >
              <span>✆</span> Tanya stok kami
            </button>
          </div>
        </div>

        <div className="hero-image">
          <img
            src={
              heroPromotion ||
              "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=90"
            }
            alt={
              heroPromotion
                ? "Promosi SUPER MURAH KUPANG"
                : "Interior rumah dengan perabot pilihan"
            }
          />

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

      {/* =====================================================
          TRUST BAR
      ====================================================== */}

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

      {/* =====================================================
          CATEGORY SECTION
      ====================================================== */}

      <section
        className="section shell"
        id="koleksi"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Cari berdasarkan kebutuhan
            </p>

            <h2>
              Lengkapi setiap
              <br />
              <em>sudut rumah.</em>
            </h2>
          </div>

          <p className="section-intro">
            Katalog perabot fungsional dengan pilihan
            harga yang transparan untuk pembelian satuan
            sampai dalam jumlah besar.
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
                  alt={category.name}
                />

                <span>
                  {category.name}
                </span>

                <ArrowRight size={19} />
              </button>
            ),
          )}
        </div>
      </section>

      {/* =====================================================
          PRODUCT CATALOG
      ====================================================== */}

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
                Harga <em>terbaik.</em>
              </h2>
            </div>

            <div className="catalog-actions">
              <label className="public-search catalog-search">
                <Search size={18} />

                <input
                  value={publicSearch}
                  onChange={(event) =>
                    setPublicSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Cari nama barang atau kategori..."
                  aria-label="Cari nama atau kategori produk"
                />

                {publicSearch && (
                  <button
                    type="button"
                    onClick={() =>
                      setPublicSearch(
                        "",
                      )
                    }
                    aria-label="Hapus pencarian produk"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>

              <div className="filters">
                {[
                  "Semua",
                  ...categoryNames,
                ].map(
                  (category) => (
                    <button
                      className={
                        activeCategory ===
                        category
                          ? "active"
                          : ""
                      }
                      key={category}
                      onClick={() =>
                        setActiveCategory(
                          category,
                        )
                      }
                    >
                      {category}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="price-legend">
            <span>
              <i className="retail-dot" />{" "}
              Ecer
            </span>

            <span>
              <i className="wholesale-dot" />{" "}
              Grosir
            </span>

            <span>
              <i className="super-dot" />{" "}
              Super grosir
            </span>
          </div>

          <div className="product-grid">
            {visibleProducts.map(
              (product) => (
                <article
                  className="product-card"
                  key={product.id}
                >
                  <div className="product-image">
                    {product.badge && (
                      <span className="badge">
                        {product.badge}
                      </span>
                    )}

                    <button
                      className="product-photo-button"
                      onClick={() =>
                        setSelectedProduct(
                          product,
                        )
                      }
                      aria-label={`Lihat detail ${product.name}`}
                    >
                      <img
                        src={
                          product.image ||
                          getDefaultCategoryImage(
                            product.category,
                          )
                        }
                        alt={product.name}
                      />
                    </button>

                    <div className="quantity-controls">
                      <button
                        className="quantity-minus"
                        onClick={() =>
                          changeCartQuantity(
                            product.id,
                            (cart[
                              product.id
                            ] || 0) - 1,
                          )
                        }
                        disabled={
                          !cart[
                            product.id
                          ]
                        }
                        aria-label={`Kurangi ${product.name}`}
                      >
                        −
                      </button>

                      <span>
                        {cart[
                          product.id
                        ] || 0}
                      </span>

                      <button
                        className="quick-view"
                        onClick={() =>
                          addToCart(
                            product,
                          )
                        }
                        aria-label={`Tambah ${product.name} ke keranjang`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="product-info">
                    <div>
                      <p className="product-category">
                        {product.category}
                      </p>

                      <h3>
                        {product.name}
                      </h3>
                    </div>

                    <div className="price-stack">
                      <strong>
                        {formatRupiah(
                          getPrice(
                            product,
                            cart[
                              product.id
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
              Produk tidak ditemukan. Coba kata kunci
              atau kategori lain.
            </p>
          )}

          {totalPublicPages > 1 && (
            <nav
              className="pagination"
              aria-label="Halaman katalog"
            >
              <button
                onClick={() =>
                  setPublicPage(
                    Math.max(
                      1,
                      publicPage - 1,
                    ),
                  )
                }
                disabled={
                  publicPage === 1
                }
                aria-label="Halaman sebelumnya"
              >
                ‹
              </button>

              {visiblePageNumbers.map(
                (page) => (
                  <button
                    key={page}
                    className={
                      publicPage ===
                      page
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setPublicPage(
                        page,
                      )
                    }
                    aria-label={`Halaman ${page}`}
                    aria-current={
                      publicPage ===
                      page
                        ? "page"
                        : undefined
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
                      publicPage + 1,
                    ),
                  )
                }
                disabled={
                  publicPage ===
                  totalPublicPages
                }
                aria-label="Halaman berikutnya"
              >
                ›
              </button>
            </nav>
          )}

          {/* CART */}

          <div className="cart-bar">
            <div>
              <strong>
                {totalQuantity} pcs di
                keranjang
              </strong>

              <span>
                {cartItems.some(
                  (product) =>
                    (cart[product.id] || 0) >= 36,
                )
                  ? "Harga super grosir aktif pada produk yang mencapai 36 pcs"
                  : cartItems.some(
                        (product) =>
                          (cart[product.id] || 0) >= 6,
                      )
                    ? "Harga grosir aktif pada produk yang mencapai 6 pcs"
                    : "Tambah 6 pcs pada produk yang sama untuk harga grosir"}
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
              <MessageCircle size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          ABOUT
      ====================================================== */}

      <section
        className="benefits shell"
        id="tentang"
      >
        <div className="benefit-photo">
          <img
            src={
              lowerPromotion ||
              "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=85"
            }
            alt={
              lowerPromotion
                ? "Promosi bawah SUPER MURAH KUPANG"
                : "Detail perabot rumah tangga"
            }
          />
        </div>

        <div className="benefit-copy">
          <p className="eyebrow">
            Kenapa SUPER MURAH KUPANG?
          </p>

          <h2>
            Belanja mudah,
            <br />
            <em>untung lebih.</em>
          </h2>

          <p>
            Kami membantu rumah tangga, pemilik toko,
            dan pelaku usaha mendapatkan perabot
            berkualitas dengan harga yang jelas sejak
            awal.
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
              <ShieldCheck size={21} />

              <span>
                <strong>
                  Produk pilihan
                </strong>

                <small>
                  Cocok untuk rumah dan
                  kebutuhan usaha.
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CLOSING
      ====================================================== */}

      <section className="closing">
        <div className="shell closing-inner">
          <p className="eyebrow">
            Mulai belanja hari ini
          </p>

          <h2>
            Harga murah untuk
            <br />
            <em>semua kebutuhan.</em>
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

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="footer">
        <div className="footer-inner shell">
          <a
            className="footer-brand"
            href="#top"
          >
            <span>SUPER</span> MURAH
            <span className="brand-dot">
              .
            </span>

            <small>KUPANG</small>
          </a>

          <p className="footer-description">
            Perabot lengkap, harga super murah.
          </p>

          <a
            className="footer-whatsapp"
            href="https://wa.me/6285755463065"
            target="_blank"
            rel="noreferrer"
          >
            <span className="footer-label">
              WhatsApp
            </span>

            <span>
              085755463065
            </span>
          </a>

          <div className="footer-social">
            <span className="footer-label">
              Ikuti kami
            </span>

            <div className="social-links">
              <a
                href="https://instagram.com/supermurah_kupang"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram SUPER MURAH KUPANG"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                aria-label="TikTok SUPER MURAH KUPANG"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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

      {/* =====================================================
          PRODUCT DETAIL MODAL
      ====================================================== */}

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
            onClick={(event) =>
              event.stopPropagation()
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
                  "Produk pilihan SUPER MURAH KUPANG untuk kebutuhan rumah dan usaha Anda."}
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
                        selectedProduct.id
                      ] || 1,
                    ),
                  )}
                </strong>
              </div>

              <div className="detail-actions">
                <button
                  className="secondary-btn"
                  onClick={() =>
                    addToCart(
                      selectedProduct,
                    )
                  }
                >
                  <Plus size={16} /> Tambah
                  1 pcs
                </button>

                <span>
                  {cart[
                    selectedProduct.id
                  ] || 0}{" "}
                  pcs di keranjang
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADMIN LOGIN / DASHBOARD
      ====================================================== */}

      {adminOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!isAdmin) {
              setAdminOpen(false);
            }
          }}
        >
          <div
            className={`admin-modal ${
              isAdmin
                ? "dashboard-modal"
                : ""
            }`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {!isAdmin ? (
              /* =================================================
                 LOGIN
              ================================================== */

              <form
                onSubmit={submitLogin}
                className="login-panel"
              >
                <button
                  type="button"
                  className="close-modal"
                  onClick={() =>
                    setAdminOpen(false)
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
                  Login <em>admin.</em>
                </h2>

                <p>
                  Kelola katalog, kategori, harga,
                  dan gambar promosi SUPER MURAH
                  KUPANG.
                </p>

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
                    placeholder="admin@email.com"
                    autoComplete="email"
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
                    placeholder="Masukkan password"
                    autoComplete="current-password"
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
                    <ArrowRight size={17} />
                  )}
                </button>
              </form>
            ) : (
              /* =================================================
                 DASHBOARD
              ================================================== */

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
                </aside>

                <div className="dashboard-content">
                  <div className="dashboard-top">
                    <div>
                      <p className="eyebrow">
                        Dashboard admin
                      </p>

                      <h2>
                        Kelola{" "}
                        <em>katalog.</em>
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
                        onClick={logout}
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

                  <p className="dashboard-desc">
                    Kelola katalog secara langsung
                    menggunakan database Supabase.
                  </p>

                  {/* =================================================
                     ADMIN CATALOG
                  ================================================== */}

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
                            event,
                          ) =>
                            setAdminSearch(
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Cari nama atau kategori barang..."
                          aria-label="Cari nama atau kategori barang"
                        />

                        {adminSearch && (
                          <button
                            type="button"
                            onClick={() =>
                              setAdminSearch(
                                "",
                              )
                            }
                            aria-label="Hapus pencarian"
                          >
                            <X
                              size={14}
                            />
                          </button>
                        )}

                        <small>
                          {adminSearch.trim()
                            .length >=
                          2
                            ? `${adminFilteredProducts.length} produk ditemukan`
                            : "Ketik minimal 2 huruf untuk mencari"}
                        </small>
                      </div>

                      <div className="import-hint">
                        Format kolom Excel:
                        {" "}
                        <strong>
                          Nama Barang
                        </strong>
                        ,{" "}
                        <strong>
                          Harga Ecer
                        </strong>
                        ,{" "}
                        <strong>
                          Harga Grosir
                        </strong>
                        ,{" "}
                        <strong>
                          Harga Super Grosir
                        </strong>
                        ,{" "}
                        <strong>
                          Gambar
                        </strong>
                        ,{" "}
                        <strong>
                          Kategori
                        </strong>
                        .
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
                                  event,
                                ) => {
                                  const category =
                                    event
                                      .target
                                      .value;

                                  const {
                                    error,
                                  } =
                                    await supabase
                                      .from(
                                        "products",
                                      )
                                      .update({
                                        category,
                                      })
                                      .eq(
                                        "id",
                                        product.id,
                                      );

                                  if (
                                    error
                                  ) {
                                    alert(
                                      `Kategori produk gagal diubah.\n\n${error.message}`,
                                    );
                                    return;
                                  }

                                  await loadProducts();
                                }}
                                aria-label={`Kategori ${product.name}`}
                              >
                                {categoryNames.map(
                                  (
                                    category,
                                  ) => (
                                    <option
                                      key={
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

                              <button
                                className="edit-btn"
                                onClick={() =>
                                  openEditor(
                                    product,
                                  )
                                }
                              >
                                <Pencil
                                  size={15}
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
                                aria-label={`Hapus ${product.name}`}
                              >
                                <X
                                  size={16}
                                />
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </>
                  )}

                  {/* =================================================
                     PROMOTION
                  ================================================== */}

                  {adminSection ===
                    "promotion" && (
                    <div className="admin-settings promotion-settings">
                      <div className="settings-copy">
                        <strong>
                          Gambar utama / promosi
                        </strong>

                        <small>
                          Gambar ini menggantikan gambar
                          utama di hero halaman depan.
                        </small>
                      </div>

                      <label className="settings-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(
                            event,
                          ) =>
                            uploadPromotionImage(
                              1,
                              event,
                            )
                          }
                        />

                        {heroPromotion ? (
                          <img
                            src={
                              heroPromotion
                            }
                            alt="Promosi utama"
                          />
                        ) : (
                          <ImagePlus
                            size={18}
                          />
                        )}

                        <span>
                          {uploadingPromotion ===
                          1
                            ? "Mengupload..."
                            : heroPromotion
                              ? "Ganti gambar utama"
                              : "Upload gambar utama"}
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
                          Hapus gambar utama
                        </button>
                      )}

                      <div className="admin-settings lower-promotion-settings">
                        <div className="settings-copy">
                          <strong>
                            Gambar promosi bawah
                          </strong>

                          <small>
                            Gambar ini menggantikan foto
                            di bagian bawah halaman
                            depan.
                          </small>
                        </div>

                        <label className="settings-upload">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(
                              event,
                            ) =>
                              uploadPromotionImage(
                                2,
                                event,
                              )
                            }
                          />

                          {lowerPromotion ? (
                            <img
                              src={
                                lowerPromotion
                              }
                              alt="Promosi bawah"
                            />
                          ) : (
                            <ImagePlus
                              size={18}
                            />
                          )}

                          <span>
                            {uploadingPromotion ===
                            2
                              ? "Mengupload..."
                              : lowerPromotion
                                ? "Ganti gambar bawah"
                                : "Upload gambar bawah"}
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
                            Hapus gambar bawah
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* =================================================
                     CATEGORIES
                  ================================================== */}

                  {adminSection ===
                    "categories" && (
                    <div className="category-manager">
                      <div>
                        <strong>
                          Kelola kategori dan gambar
                        </strong>

                        <small>
                          Setiap perubahan tersimpan di
                          Supabase dan tetap ada setelah
                          reload.
                        </small>
                      </div>

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
                            event,
                          ) =>
                            setCategoryName(
                              event
                                .target
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

                          {savingCategory
                            ? "Menyimpan..."
                            : "Tambah"}
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
                                alt={`Gambar ${category.name}`}
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
                                      event,
                                    ) =>
                                      uploadCategoryImage(
                                        category,
                                        event,
                                      )
                                    }
                                    disabled={
                                      uploadingCategoryImage ===
                                      category.id
                                    }
                                  />

                                  <ImagePlus
                                    size={14}
                                  />

                                  {uploadingCategoryImage ===
                                  category.id
                                    ? "Mengupload..."
                                    : "Ganti gambar"}
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
                                  Hapus gambar
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
                                      product,
                                    ) =>
                                      product.category ===
                                      category.name,
                                  )}
                                >
                                  <X
                                    size={
                                      14
                                    }
                                  />

                                  Hapus kategori
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

      {/* =====================================================
          PRODUCT EDITOR
      ====================================================== */}

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
                  Nama produk

                  <input
                    value={form.name}
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          name: event
                            .target
                            .value,
                        }),
                      )
                    }
                    required
                    placeholder="Contoh: Meja Lipat Serbaguna"
                  />
                </label>

                <label>
                  Kategori

                  <select
                    value={
                      form.category
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          category:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  >
                    {categoryNames.map(
                      (
                        category,
                      ) => (
                        <option
                          key={
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
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          retail:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Rp0"
                  />
                </label>

                <label>
                  Harga grosir

                  <input
                    value={
                      form.wholesale
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          wholesale:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Rp0"
                  />
                </label>

                <label>
                  Harga super grosir

                  <input
                    value={
                      form.superWholesale
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          superWholesale:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Rp0"
                  />
                </label>

                <label>
                  Label (opsional)

                  <input
                    value={
                      form.badge ||
                      ""
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          badge:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Terlaris"
                  />
                </label>

                <label className="description-field">
                  Deskripsi singkat

                  <textarea
                    value={
                      form.description ||
                      ""
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          description:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Contoh: Rak serbaguna untuk menyimpan barang di rumah."
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
                    ? "Mengupload gambar..."
                    : form.image
                      ? "Ganti gambar katalog"
                      : "Upload gambar katalog"}
                </span>

                {form.image && (
                  <img
                    src={form.image}
                    alt="Preview katalog"
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
                  Hapus produk dari katalog
                </button>
              )}
            </form>
          </div>
        )}
    </main>
  );
}

export default App;
