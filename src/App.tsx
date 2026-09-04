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
  image_url: String(promotion.image_url || "").trim(),
  created_at: promotion.created_at,
});

const getDefaultCategoryImage = (categoryName: string) => {
  const found = defaultCategories.find(
    (item) => item.label === categoryName,
  );

  return found?.image || defaultCategories[0].image;
};

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
  const [promotionsLoading, setPromotionsLoading] = useState(true);

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
  const [adminSection, setAdminSection] = useState<AdminSection>("catalog");

  // --- PERBAIKAN 1: CART DENGAN LOCAL STORAGE ---
  const [cart, setCart] = useState<Record<number, number>>(() => {
    // Ambil data dari localStorage saat aplikasi pertama kali dimuat
    try {
      const savedCart = localStorage.getItem("supermurah_cart");
      return savedCart ? JSON.parse(savedCart) : {};
    } catch (error) {
      console.error("Gagal memuat cart dari localStorage", error);
      return {};
    }
  });

  // Simpan ke localStorage setiap kali state cart berubah
  useEffect(() => {
    localStorage.setItem("supermurah_cart", JSON.stringify(cart));
  }, [cart]);
  // ----------------------------------------------

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

  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const storeLogo = "/supermurahkupang.png";

  const checkAdmin = async () => {
    setCheckingAuth(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
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
        setIsAdmin(false);
        return;
      }
      setIsAdmin(Boolean(data));
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => checkAdmin());
    return () => subscription.unsubscribe();
  }, []);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");

    if (!login.email.trim() || !login.password) {
      setLoginError("Email dan password wajib diisi.");
      return;
    }
    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: login.email.trim(),
        password: login.password,
      });

      if (error || !data.user) {
        setLoginError("Email atau password tidak sesuai.");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("id, role")
        .eq("id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        setLoginError("Akun berhasil login, tetapi tidak memiliki akses admin.");
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
      setAdminOpen(true);
      setLogin({ email: "", password: "" });
    } catch (error) {
      setLoginError("Terjadi kesalahan saat login.");
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

  const loadProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
    if (!error) setProducts((data || []).map(normalizeProduct));
  };

  const loadCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("id", { ascending: true });
    if (!error) setCategories((data || []).map(normalizeCategory));
  };

  const loadPromotions = async () => {
    setPromotionsLoading(true);
    try {
      const { data, error } = await supabase.from("promotions").select("*").order("id", { ascending: true });
      if (!error) setPromotions((data || []).map(normalizePromotion));
    } finally {
      setPromotionsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadPromotions();
  }, []);

  useEffect(() => {
    const productsChannel = supabase.channel("products-live").on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadProducts).subscribe();
    const categoriesChannel = supabase.channel("categories-live").on("postgres_changes", { event: "*", schema: "public", table: "categories" }, loadCategories).subscribe();
    const promotionsChannel = supabase.channel("promotions-live").on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, loadPromotions).subscribe();
    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(promotionsChannel);
    };
  }, []);

  const heroPromotion = promotions.find((item) => item.id === 1)?.image_url ?? "";
  const lowerPromotion = promotions.find((item) => item.id === 2)?.image_url ?? "";
  const categoryNames = useMemo(() => categories.map((category) => category.name), [categories]);

  const filteredProducts = activeCategory === "Semua" ? products : products.filter((product) => product.category === activeCategory);
  const publicFilteredProducts = filteredProducts.filter((product) => publicSearch.trim().length < 2 ? true : `${product.name} ${product.category}`.toLowerCase().includes(publicSearch.trim().toLowerCase()));

  const productsPerPage = 12;
  const totalPublicPages = Math.max(1, Math.ceil(publicFilteredProducts.length / productsPerPage));
  const pageWindowStart = publicPage <= 10 ? 1 : publicPage % 10 === 0 ? publicPage : Math.floor((publicPage - 1) / 10) * 10 + 1;
  const pageWindowEnd = Math.min(totalPublicPages, pageWindowStart + 9);
  const visiblePageNumbers = Array.from({ length: pageWindowEnd - pageWindowStart + 1 }, (_, index) => pageWindowStart + index);
  const visibleProducts = publicFilteredProducts.slice((publicPage - 1) * productsPerPage, publicPage * productsPerPage);

  const adminFilteredProducts = adminSearch.trim().length < 2 ? products : products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(adminSearch.trim().toLowerCase()));

  useEffect(() => { setPublicPage(1); }, [activeCategory, publicSearch]);

  const cartItems = products.filter((product) => (cart[product.id] || 0) > 0);
  const totalQuantity = Object.values(cart).reduce((total, quantity) => total + quantity, 0);

  const getPrice = (product: Product, quantity: number) =>
    quantity >= 36 ? priceNumber(product.superWholesale) : quantity >= 6 ? priceNumber(product.wholesale) : priceNumber(product.retail);

  const addToCart = (product: Product) =>
    setCart((items) => ({ ...items, [product.id]: (items[product.id] || 0) + 1 }));

  const changeCartQuantity = (id: number, quantity: number) =>
    setCart((items) => {
      const next = { ...items };
      if (quantity <= 0 || isNaN(quantity)) delete next[id];
      else next[id] = quantity;
      return next;
    });

  const whatsapp = () => window.open("https://wa.me/6285755463065?text=Halo%20SUPER%20MURAH%20KUPANG%2C%20saya%20ingin%20bertanya%20tentang%20produk.", "_blank");

  const checkout = () => {
    if (!cartItems.length) return;
    const lines = cartItems.map((product) => {
      const quantity = cart[product.id];
      const unitPrice = getPrice(product, quantity);
      return `- ${product.name} (${quantity} pcs) x ${formatRupiah(unitPrice)} = ${formatRupiah(unitPrice * quantity)}`;
    });
    const total = cartItems.reduce((sum, product) => sum + getPrice(product, cart[product.id]) * cart[product.id], 0);
    const tier = cartItems.some((product) => (cart[product.id] || 0) >= 36)
      ? "Harga dihitung per produk (ada produk super grosir)"
      : cartItems.some((product) => (cart[product.id] || 0) >= 6)
        ? "Harga dihitung per produk (ada produk grosir)"
        : "Harga ecer";

    const message = `Halo SUPER MURAH KUPANG, saya ingin checkout:\n\n${lines.join("\n")}\n\nTotal barang: ${totalQuantity} pcs\nKategori harga: ${tier}\nTotal belanja: ${formatRupiah(total)}\n\nNama pemesan: `;
    window.open(`https://wa.me/6285755463065?text=${encodeURIComponent(message)}`, "_blank");
  };

  const openEditor = (product?: Product) => {
    setEditing(product ?? null);
    setForm(product ? { ...product, badge: product.badge || "", description: product.description || "" } : { ...emptyProduct, category: categoryNames[0] || "Dapur" });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditing(null);
    setForm({ ...emptyProduct, category: categoryNames[0] || "Dapur" });
    setEditorOpen(false);
  };

  const uploadProductImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingProductImage(true);
    try {
      const result = await uploadToStorage("product-images", file, "products");
      setForm((current) => ({ ...current, image: result.publicUrl }));
    } catch (error: any) {
      alert(`Gambar produk gagal diupload.\n\n${error.message}`);
    } finally {
      setUploadingProductImage(false);
    }
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.image || !form.category) return;
    setSavingProduct(true);
    try {
      const payload = {
        name: form.name.trim(), category: form.category, retail: form.retail, wholesale: form.wholesale,
        super_wholesale: form.superWholesale, image: form.image, badge: form.badge?.trim() || null, description: form.description?.trim() || null
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (!error && editing.image && editing.image !== form.image) await removeStorageFileByUrl("product-images", editing.image);
      } else {
        await supabase.from("products").insert(payload);
      }
      await loadProducts();
      closeEditor();
    } finally {
      setSavingProduct(false);
    }
  };

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (!error) {
      if (product.image) await removeStorageFileByUrl("product-images", product.image);
      await loadProducts();
      changeCartQuantity(product.id, 0); // Bersihkan dari cart
      if (editing?.id === product.id) closeEditor();
    }
  };

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name || categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setSavingCategory(true);
    await supabase.from("categories").insert({ name, image: getDefaultCategoryImage(name) });
    setCategoryName("");
    await loadCategories();
    setSavingCategory(false);
  };

  const removeCategory = async (category: Category) => {
    if (products.some((p) => p.category === category.name)) {
      alert("Kategori masih digunakan oleh produk.");
      return;
    }
    if (!window.confirm(`Hapus kategori "${category.name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (!error) {
      if (category.image) await removeStorageFileByUrl("category-images", category.image);
      await loadCategories();
      if (activeCategory === category.name) setActiveCategory("Semua");
    }
  };

  const uploadCategoryImage = async (category: Category, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingCategoryImage(category.id);
    try {
      const result = await uploadToStorage("category-images", file, `categories/${category.id}`);
      const { error } = await supabase.from("categories").update({ image: result.publicUrl }).eq("id", category.id);
      if (!error && category.image && category.image !== result.publicUrl) await removeStorageFileByUrl("category-images", category.image);
      await loadCategories();
    } finally {
      setUploadingCategoryImage(null);
    }
  };

  const removeCategoryImage = async (category: Category) => {
    const defaultImg = getDefaultCategoryImage(category.name);
    const { error } = await supabase.from("categories").update({ image: defaultImg }).eq("id", category.id);
    if (!error && category.image && category.image !== defaultImg) await removeStorageFileByUrl("category-images", category.image);
    await loadCategories();
  };

  const uploadPromotionImage = async (promotionId: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingPromotion(promotionId);
    try {
      const oldPromotion = promotions.find((item) => item.id === promotionId);
      const result = await uploadToStorage("promotion-images", file, promotionId === 1 ? "hero" : "lower");
      if (oldPromotion) {
        await supabase.from("promotions").update({ image_url: result.publicUrl }).eq("id", promotionId);
        if (oldPromotion.image_url) await removeStorageFileByUrl("promotion-images", oldPromotion.image_url);
      } else {
        await supabase.from("promotions").insert({ id: promotionId, image_url: result.publicUrl });
      }
      await loadPromotions();
    } finally {
      setUploadingPromotion(null);
    }
  };

  const removePromotionImage = async (promotionId: number) => {
    const promotion = promotions.find((item) => item.id === promotionId);
    if (!promotion || !window.confirm("Hapus gambar promosi?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", promotionId);
    if (!error && promotion.image_url) {
      await removeStorageFileByUrl("promotion-images", promotion.image_url);
      await loadPromotions();
    }
  };

  const importExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const workbook = XLSX.read(loadEvent.target?.result, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
        const imported = rows.map((row) => {
          const values = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[\s_-]/g, ""), v]));
          return {
            name: String(values.namabarang || values.nama || "").trim(),
            category: String(values.kategori || "Dapur").trim(),
            retail: String(values.hargaecer || values.ecer || ""),
            wholesale: String(values.hargagrosir || values.grosir || ""),
            super_wholesale: String(values.hargasupergrosir || values.supergrosir || ""),
            image: String(values.gambar || values.image || ""),
            badge: String(values.badge || ""),
            description: String(values.deskripsi || values.description || ""),
          };
        }).filter((p) => p.name);

        if (!imported.length) { alert("Tidak ada produk valid."); return; }

        // --- PERBAIKAN 3: MENCEGAH DUPLIKASI EXCEL ---
        const existingNames = new Set(products.map(p => p.name.toLowerCase()));
        const newProductsToInsert = imported.filter(p => !existingNames.has(p.name.toLowerCase()));

        if(newProductsToInsert.length === 0){
          alert("Semua produk di Excel sudah ada di katalog. Tidak ada barang baru yang ditambahkan.");
          return;
        }

        const { error } = await supabase.from("products").insert(newProductsToInsert);
        // ---------------------------------------------

        if (error) { alert(`Import gagal.\n\n${error.message}`); return; }

        const existingCategoryNames = new Set(categories.map((c) => c.name.toLowerCase()));
        const newCategories = Array.from(new Set(newProductsToInsert.map((p) => p.category))).filter((n) => !existingCategoryNames.has(n.toLowerCase()));
        if (newCategories.length) await supabase.from("categories").insert(newCategories.map((name) => ({ name, image: getDefaultCategoryImage(name) })));

        await loadProducts();
        await loadCategories();
        alert(`${newProductsToInsert.length} produk baru berhasil diimport.`);
      } catch (error) {
        alert("File Excel tidak dapat diproses.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const updateLogin = (event: ChangeEvent<HTMLInputElement>) => {
    setLogin((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  return (
    <main>
      <div className="announcement">
        Pusat grosir perabot rumah tangga terpercaya di Kupang <ArrowRight size={15} />
      </div>

      <nav className="nav shell">
        <a className="brand" href="#top">
          <img className="store-logo" src={storeLogo} alt="Logo" />
          <span>SUPER</span> MURAH<span className="brand-dot">.</span><small>KUPANG</small>
        </a>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#koleksi" onClick={() => setMenuOpen(false)}>Koleksi <ChevronDown size={15} /></a>
          <a href="#unggulan" onClick={() => setMenuOpen(false)}>Harga Grosir</a>
          <a href="#tentang" onClick={() => setMenuOpen(false)}>Tentang Kami</a>
        </div>
        <div className="nav-actions">
          <button className="admin-link" onClick={() => { setAdminOpen(true); setLoginError(""); }}><LogIn size={16} /> Admin</button>
          <button className="order-btn" onClick={whatsapp}>Pesan via WhatsApp <ArrowRight size={16} /></button>
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Grosir perabot rumah tangga Kupang</p>
          <h1>Harga super murah,<br /><em>pilihan</em> serba lengkap.</h1>
          <p className="hero-text">Belanja perabot rumah tangga untuk kebutuhan rumah, toko, kos, dan usaha Anda. Ada harga ecer, grosir, dan super grosir.</p>
          <div className="hero-cta">
            <button className="primary-btn" onClick={() => document.getElementById("unggulan")?.scrollIntoView({ behavior: "smooth" })}>Lihat katalog <ArrowRight size={17} /></button>
            <button className="play-btn" onClick={whatsapp}><span>✆</span> Tanya stok kami</button>
          </div>
        </div>
        <div className="hero-image">
          {promotionsLoading ? (
            <div className="hero-image-loading"><span>Memuat promosi...</span></div>
          ) : heroPromotion ? (
            <img src={heroPromotion} alt="Promosi" loading="eager" decoding="async" />
          ) : (
            <div className="hero-image-empty"><span>Belum ada gambar promosi</span></div>
          )}
          <div className="hero-note"><span className="note-line" /><span>Harga bersahabat,<br />stok bersahabat.</span></div>
        </div>
      </section>

      <section className="trust-bar">
        <div className="shell trust-items">
          <div><strong>3x</strong><span>Pilihan harga<br />sesuai kebutuhan</span></div>
          <div><strong>1000+</strong><span>Produk siap<br />dikirim</span></div>
          <div><strong>KPG</strong><span>Melayani Kupang<br />dan sekitarnya</span></div>
          <div className="trust-quote">“Belanja banyak makin hemat,<br /><em>cocok untuk toko dan usaha.</em>”</div>
        </div>
      </section>

      <section className="section shell" id="koleksi">
        <div className="section-heading">
          <div><p className="eyebrow">Cari berdasarkan kebutuhan</p><h2>Lengkapi setiap<br /><em>sudut rumah.</em></h2></div>
          <p className="section-intro">Katalog perabot fungsional dengan pilihan harga transparan untuk pembelian satuan sampai besar.</p>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <button
              className={`category-card category-${index % 4}`}
              key={category.id}
              onClick={() => { setActiveCategory(category.name); document.getElementById("unggulan")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              <img src={category.image || getDefaultCategoryImage(category.name)} alt={category.name} />
              <span>{category.name}</span><ArrowRight size={19} />
            </button>
          ))}
        </div>
      </section>

      <section className="featured section" id="unggulan">
        <div className="shell">
          <div className="section-heading featured-heading">
            <div><p className="eyebrow">Katalog terbaru</p><h2>Harga <em>terbaik.</em></h2></div>
            <div className="catalog-actions">
              <label className="public-search catalog-search">
                <Search size={18} />
                <input value={publicSearch} onChange={(e) => setPublicSearch(e.target.value)} placeholder="Cari nama barang..." />
                {publicSearch && <button type="button" onClick={() => setPublicSearch("")}><X size={14} /></button>}
              </label>
              <div className="filters">
                {["Semua", ...categoryNames].map((cat) => (
                  <button className={activeCategory === cat ? "active" : ""} key={cat} onClick={() => setActiveCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="price-legend">
            <span><i className="retail-dot" /> Ecer</span>
            <span><i className="wholesale-dot" /> Grosir</span>
            <span><i className="super-dot" /> Super grosir</span>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  {product.badge && <span className="badge">{product.badge}</span>}
                  <button className="product-photo-button" onClick={() => setSelectedProduct(product)}>
                    <img src={product.image || getDefaultCategoryImage(product.category)} alt={product.name} />
                  </button>
                  
                  {/* --- PERBAIKAN 2: INPUT KUANTITAS MANUAL (CATALOG) --- */}
                  <div className="quantity-controls">
                    <button className="quantity-minus" onClick={() => changeCartQuantity(product.id, (cart[product.id] || 0) - 1)} disabled={!cart[product.id]}>−</button>
                    <input 
                      type="number" 
                      min="0"
                      value={cart[product.id] || ""}
                      placeholder="0"
                      onChange={(e) => changeCartQuantity(product.id, parseInt(e.target.value) || 0)}
                      style={{ width: "35px", textAlign: "center", border: "none", background: "transparent", fontWeight: "bold", fontSize: "14px" }}
                    />
                    <button className="quick-view" onClick={() => addToCart(product)}>+</button>
                  </div>
                  {/* ----------------------------------------------------- */}
                </div>
                <div className="product-info">
                  <div><p className="product-category">{product.category}</p><h3>{product.name}</h3></div>
                  <div className="price-stack">
                    <strong>{formatRupiah(getPrice(product, cart[product.id] || 0))}</strong>
                    <span>{product.wholesale} grosir</span>
                    <span>{product.superWholesale} super</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {publicFilteredProducts.length === 0 && <p className="empty-catalog">Produk tidak ditemukan.</p>}
          {totalPublicPages > 1 && (
            <nav className="pagination">
              <button onClick={() => setPublicPage(Math.max(1, publicPage - 1))} disabled={publicPage === 1}>‹</button>
              {visiblePageNumbers.map((page) => (
                <button key={page} className={publicPage === page ? "active" : ""} onClick={() => setPublicPage(page)}>{page}</button>
              ))}
              <button onClick={() => setPublicPage(Math.min(totalPublicPages, publicPage + 1))} disabled={publicPage === totalPublicPages}>›</button>
            </nav>
          )}

          <div className="cart-bar">
            <div>
              <strong>{totalQuantity} pcs di keranjang</strong>
              <span>{cartItems.some(p => (cart[p.id] || 0) >= 36) ? "Harga super grosir aktif" : cartItems.some(p => (cart[p.id] || 0) >= 6) ? "Harga grosir aktif" : "Tambah 6 pcs untuk harga grosir"}</span>
            </div>
            <strong>{formatRupiah(cartItems.reduce((sum, p) => sum + getPrice(p, cart[p.id]) * cart[p.id], 0))}</strong>
            <button className="primary-btn" onClick={checkout} disabled={!cartItems.length}>Checkout via WhatsApp <MessageCircle size={17} /></button>
          </div>
        </div>
      </section>

      <section className="benefits shell" id="tentang">
        <div className="benefit-photo">
          {promotionsLoading ? <div className="benefit-photo-loading"><span>Memuat...</span></div> : lowerPromotion ? <img src={lowerPromotion} alt="Promosi bawah" loading="lazy" /> : <div className="benefit-photo-empty"><span>Belum ada gambar</span></div>}
        </div>
        <div className="benefit-copy">
          <p className="eyebrow">Kenapa SUPER MURAH KUPANG?</p>
          <h2>Belanja mudah,<br /><em>untung lebih.</em></h2>
          <p>Kami membantu rumah tangga, pemilik toko, dan pelaku usaha mendapatkan perabot berkualitas dengan harga yang jelas.</p>
          <div className="benefit-list">
            <div><Truck size={21} /><span><strong>Pengiriman dari Kupang</strong><small>Stok aman dan siap dikirim.</small></span></div>
            <div><Package size={21} /><span><strong>Harga bertingkat</strong><small>Ecer, grosir, sampai super grosir.</small></span></div>
            <div><ShieldCheck size={21} /><span><strong>Produk pilihan</strong><small>Cocok untuk rumah dan usaha.</small></span></div>
          </div>
        </div>
      </section>

      <section className="closing">
        <div className="shell closing-inner">
          <p className="eyebrow">Mulai belanja hari ini</p>
          <h2>Harga murah untuk<br /><em>semua kebutuhan.</em></h2>
          <button className="primary-btn light" onClick={whatsapp}>Konsultasi stok sekarang <MessageCircle size={18} /></button>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner shell">
          {/* Kolom 1: Brand */}
          <div className="footer-col-brand">
            <a className="footer-brand" href="#top">
              <span>SUPER</span> MURAH<span className="brand-dot">.</span>
              <small>KUPANG</small>
            </a>
            <p className="footer-description">
              Perabot lengkap, harga super murah.
            </p>
          </div>

          {/* Kolom 2: Alamat Toko */}
          <div className="footer-col">
            <span className="footer-label">Alamat Toko</span>
            <p className="footer-text">
              Jln. Trans-Timor, Km. 10, Oesapa, Kupang
            </p>
          </div>

          {/* Kolom 3: WhatsApp */}
          <div className="footer-col">
            <span className="footer-label">WhatsApp</span>
            <a
              className="footer-whatsapp"
              href="https://wa.me/6285755463065"
              target="_blank"
              rel="noreferrer"
            >
              085755463065
            </a>
          </div>

          {/* Kolom 4: Sosial Media (Dengan Ikon) */}
          <div className="footer-col">
            <span className="footer-label">Ikuti Kami</span>
            <div className="footer-social-links">
              <a
                href="https://instagram.com/supermurah_kupang"
                target="_blank"
                rel="noreferrer"
                className="social-link-item"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
                <span>@supermurah_kupang</span>
              </a>

              <a
                href="https://tiktok.com/@super.murah.kupang"
                target="_blank"
                rel="noreferrer"
                className="social-link-item"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
                  <path d="M15 4c.4 2.3 1.8 3.8 4 4v3.1c-1.5 0-2.9-.4-4-1.1V16a5 5 0 1 1-5-5c.4 0 .7 0 1 .1v3.2a2 2 0 1 0 1.8 2V4H15z" fill="currentColor" />
                </svg>
                <span>@super.murah.kupang</span>
              </a>
            </div>
          </div>

          {/* Copyright di bagian bawah */}
          <small className="footer-copyright">
            © 2024 SUPER MURAH KUPANG
          </small>
        </div>
      </footer>

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedProduct(null)}><X /></button>
            <img src={selectedProduct.image || getDefaultCategoryImage(selectedProduct.category)} alt={selectedProduct.name} />
            <div>
              <p className="product-category">{selectedProduct.category}</p>
              <h2>{selectedProduct.name}</h2>
              <p className="detail-description">{selectedProduct.description || "Produk pilihan untuk kebutuhan rumah."}</p>
              <div className="detail-price">
                <span>Mulai dari</span>
                <strong>{formatRupiah(getPrice(selectedProduct, cart[selectedProduct.id] || 1))}</strong>
              </div>
              <div className="detail-actions">
                {/* --- PERBAIKAN 2: INPUT KUANTITAS MANUAL (DETAIL MODAL) --- */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "#f3f4f6", padding: "8px 15px", borderRadius: "8px" }}>
                  <button onClick={() => changeCartQuantity(selectedProduct.id, (cart[selectedProduct.id] || 0) - 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>−</button>
                  <input 
                    type="number" 
                    min="0"
                    value={cart[selectedProduct.id] || ""}
                    placeholder="0"
                    onChange={(e) => changeCartQuantity(selectedProduct.id, parseInt(e.target.value) || 0)}
                    style={{ width: "40px", textAlign: "center", border: "none", background: "transparent", fontWeight: "bold", fontSize: "16px" }}
                  />
                  <button onClick={() => addToCart(selectedProduct)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>+</button>
                </div>
                {/* ---------------------------------------------------------- */}
              </div>
            </div>
          </div>
        </div>
      )}

      {adminOpen && (
        <div className="modal-backdrop" onClick={() => !isAdmin && setAdminOpen(false)}>
          <div className={`admin-modal ${isAdmin ? "dashboard-modal" : ""}`} onClick={(e) => e.stopPropagation()}>
            {!isAdmin ? (
              <form onSubmit={submitLogin} className="login-panel">
                <button type="button" className="close-modal" onClick={() => setAdminOpen(false)}><X /></button>
                <div className="admin-mark"><LogIn /></div>
                <p className="eyebrow">Area pengelola</p>
                <h2>Login <em>admin.</em></h2>
                <label>Email admin <input name="email" type="email" value={login.email} onChange={updateLogin} required /></label>
                <label>Password <input name="password" type="password" value={login.password} onChange={updateLogin} required /></label>
                {loginError && <div className="login-error">{loginError}</div>}
                <button className="primary-btn login-button" disabled={loginLoading || checkingAuth}>{loginLoading ? "Memeriksa..." : "Masuk ke dashboard"} {!loginLoading && <ArrowRight size={17} />}</button>
              </form>
            ) : (
              <div className="dashboard">
                <aside className="dashboard-sidebar">
                  <p className="sidebar-label">Menu admin</p>
                  <button className={adminSection === "catalog" ? "active" : ""} onClick={() => setAdminSection("catalog")}><LayoutDashboard size={17} /> Katalog produk</button>
                  <button className={adminSection === "promotion" ? "active" : ""} onClick={() => setAdminSection("promotion")}><Megaphone size={17} /> Halaman promosi</button>
                  <button className={adminSection === "categories" ? "active" : ""} onClick={() => setAdminSection("categories")}><Tags size={17} /> Kelola kategori</button>
                </aside>
                <div className="dashboard-content">
                  <div className="dashboard-top">
                    <div><p className="eyebrow">Dashboard admin</p><h2>Kelola <em>katalog.</em></h2></div>
                    <div className="dashboard-actions">
                      {adminSection === "catalog" && (
                        <>
                          <label className="import-btn"><input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} /><Package size={16} /> Import Excel</label>
                          <button className="secondary-btn" onClick={() => openEditor()}><Plus size={16} /> Tambah produk</button>
                        </>
                      )}
                      <button className="logout-btn" onClick={logout}><LogOut size={16} /> Keluar</button>
                      <button className="close-modal" onClick={() => setAdminOpen(false)}><X /></button>
                    </div>
                  </div>
                  
                  {adminSection === "catalog" && (
                    <>
                      <div className="admin-search">
                        <Search size={17} />
                        <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Cari nama atau kategori barang..." />
                        {adminSearch && <button type="button" onClick={() => setAdminSearch("")}><X size={14} /></button>}
                      </div>
                      <div className="admin-product-list">
                        {adminFilteredProducts.map((product) => (
                          <div className="admin-product-row" key={product.id}>
                            <img src={product.image || getDefaultCategoryImage(product.category)} alt="" />
                            <div>
                              <strong>{product.name}</strong>
                              <small>{product.retail} / {product.wholesale} / {product.superWholesale}</small>
                            </div>
                            <select value={product.category} onChange={async (e) => {
                              await supabase.from("products").update({ category: e.target.value }).eq("id", product.id);
                              await loadProducts();
                            }}>
                              {categoryNames.map((cat) => <option key={cat}>{cat}</option>)}
                            </select>
                            <button className="edit-btn" onClick={() => openEditor(product)}><Pencil size={15} /> Edit</button>
                            <button className="delete-btn" onClick={() => removeProduct(product)}><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {adminSection === "promotion" && (
                    <div className="admin-settings promotion-settings">
                      <div className="settings-copy"><strong>Gambar utama</strong><small>Hero halaman depan.</small></div>
                      <label className="settings-upload">
                        <input type="file" accept="image/*" onChange={(e) => uploadPromotionImage(1, e)} />
                        {heroPromotion ? <img src={heroPromotion} alt="Hero" /> : <ImagePlus size={18} />}
                        <span>{uploadingPromotion === 1 ? "Upload..." : "Ganti gambar"}</span>
                      </label>
                      {heroPromotion && <button className="remove-logo" onClick={() => removePromotionImage(1)}>Hapus</button>}
                      
                      <div className="settings-copy" style={{ marginTop: "30px" }}><strong>Gambar bawah</strong><small>Foto bawah.</small></div>
                      <label className="settings-upload">
                        <input type="file" accept="image/*" onChange={(e) => uploadPromotionImage(2, e)} />
                        {lowerPromotion ? <img src={lowerPromotion} alt="Bawah" /> : <ImagePlus size={18} />}
                        <span>{uploadingPromotion === 2 ? "Upload..." : "Ganti gambar"}</span>
                      </label>
                      {lowerPromotion && <button className="remove-logo" onClick={() => removePromotionImage(2)}>Hapus</button>}
                    </div>
                  )}

                  {adminSection === "categories" && (
                    <div className="category-manager">
                      <form onSubmit={addCategory}>
                        <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Nama kategori baru" disabled={savingCategory} />
                        <button className="secondary-btn" disabled={savingCategory}><Plus size={15} /> Tambah</button>
                      </form>
                      <div className="category-editor-grid">
                        {categories.map((category) => (
                          <div className="category-editor-card" key={category.id}>
                            <img src={category.image || getDefaultCategoryImage(category.name)} alt="" />
                            <strong>{category.name}</strong>
                            <div className="category-editor-actions">
                              <label className="edit-image-btn">
                                <input type="file" accept="image/*" onChange={(e) => uploadCategoryImage(category, e)} disabled={uploadingCategoryImage === category.id} />
                                <ImagePlus size={14} /> Ganti
                              </label>
                              <button type="button" className="remove-image-btn" onClick={() => removeCategoryImage(category)}>Hapus Gbr</button>
                              <button type="button" className="delete-category-btn" onClick={() => removeCategory(category)} disabled={products.some(p => p.category === category.name)}><X size={14} /> Hapus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && editorOpen && (
        <div className="editor-overlay">
          <form className="product-editor" onSubmit={saveProduct}>
            <div className="editor-head">
              <div><p className="eyebrow">{editing ? "Edit katalog" : "Katalog baru"}</p><h2>{editing ? "Ubah produk." : "Tambah produk."}</h2></div>
              <button type="button" className="close-modal" onClick={closeEditor}><X /></button>
            </div>
            <div className="editor-grid">
              <label>Nama produk <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required /></label>
              <label>Kategori 
                <select value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}>
                  {categoryNames.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>Harga ecer <input value={form.retail} onChange={(e) => setForm((c) => ({ ...c, retail: e.target.value }))} /></label>
              <label>Harga grosir <input value={form.wholesale} onChange={(e) => setForm((c) => ({ ...c, wholesale: e.target.value }))} /></label>
              <label>Harga super <input value={form.superWholesale} onChange={(e) => setForm((c) => ({ ...c, superWholesale: e.target.value }))} /></label>
              <label>Label <input value={form.badge || ""} onChange={(e) => setForm((c) => ({ ...c, badge: e.target.value }))} /></label>
              <label className="description-field">Deskripsi <textarea value={form.description || ""} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} /></label>
            </div>
            <label className="image-upload">
              <input type="file" accept="image/*" onChange={uploadProductImage} disabled={uploadingProductImage} />
              <span><ImagePlus size={22} /> {uploadingProductImage ? "Mengupload..." : form.image ? "Ganti gambar" : "Upload gambar"}</span>
              {form.image && <img src={form.image} alt="Preview" />}
            </label>
            <button className="primary-btn login-button" disabled={savingProduct || uploadingProductImage}>
              {savingProduct ? "Menyimpan..." : "Simpan katalog"} {!savingProduct && <ArrowRight size={17} />}
            </button>
            {editing && <button type="button" className="delete-product-editor" onClick={() => removeProduct(editing)}>Hapus produk dari katalog</button>}
          </form>
        </div>
      )}
    </main>
  );
}

export default App;