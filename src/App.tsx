import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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

type Category = string;
type Product = {
  id: number;
  name: string;
  category: string;
  image: string;
  badge?: string;
  retail: string;
  wholesale: string;
  superWholesale: string;
  description?: string;
};

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

const initialProducts: Product[] = [
  {
    id: 1,
    name: "Kursi Santai Rotan",
    category: "Ruang Tamu",
    retail: "Rp225.000",
    wholesale: "Rp195.000",
    superWholesale: "Rp175.000",
    image:
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=900&q=85",
    badge: "Terlaris",
    description:
      "Kursi rotan nyaman untuk ruang tamu, teras, atau sudut santai.",
  },
  {
    id: 2,
    name: "Set Wadah Dapur Kaca",
    category: "Dapur",
    retail: "Rp85.000",
    wholesale: "Rp75.000",
    superWholesale: "Rp68.000",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=85",
    description:
      "Wadah kaca praktis untuk menyimpan bahan makanan dan bumbu dapur.",
  },
  {
    id: 3,
    name: "Keranjang Laundry Anyam",
    category: "Organisasi",
    retail: "Rp120.000",
    wholesale: "Rp105.000",
    superWholesale: "Rp96.000",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85",
    description:
      "Keranjang anyam serbaguna untuk laundry dan penyimpanan rumah.",
  },
  {
    id: 4,
    name: "Rak Samping Minimalis",
    category: "Kamar",
    retail: "Rp275.000",
    wholesale: "Rp245.000",
    superWholesale: "Rp225.000",
    image:
      "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=900&q=85",
    description:
      "Rak minimalis untuk menyimpan barang kecil di kamar atau ruang kerja.",
  },
];

const emptyProduct: Omit<Product, "id"> = {
  name: "",
  category: "Dapur",
  retail: "",
  wholesale: "",
  superWholesale: "",
  image: "",
  description: "",
};

const priceNumber = (value: string) =>
  Number(value.replace(/[^0-9]/g, "")) || 0;
const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

const compressImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Format gambar tidak didukung."));
      image.onload = () => {
        const maxSize = 1600;
        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas
          .getContext("2d")
          ?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const saveLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the current React state usable when browser storage is full.
  }
};

function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem("super-murah-products");
    return saved ? JSON.parse(saved) : initialProducts;
  });
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("super-murah-categories");
    return saved
      ? JSON.parse(saved)
      : defaultCategories.map((category) => category.label);
  });
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>(
    () => {
      const saved = localStorage.getItem("super-murah-category-images");
      if (saved) return JSON.parse(saved);
      return Object.fromEntries(
        defaultCategories.map((category) => [category.label, category.image]),
      );
    },
  );
  const storeLogo = "/supermurahkupang.png";
  const [promotionImage, setPromotionImage] = useState(
    () => localStorage.getItem("super-murah-promotion") || "",
  );
  const [lowerPromotionImage, setLowerPromotionImage] = useState(
    () => localStorage.getItem("super-murah-lower-promotion") || "",
  );
  const [activeCategory, setActiveCategory] = useState<Category>("Semua");
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(
    () => sessionStorage.getItem("super-murah-admin") === "true",
  );
  const [loginError, setLoginError] = useState("");
  const [login, setLogin] = useState({ username: "", password: "" });
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [publicSearch, setPublicSearch] = useState("");
  const [publicPage, setPublicPage] = useState(1);
  const [adminSection, setAdminSection] = useState<
    "catalog" | "promotion" | "categories"
  >("catalog");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyProduct);

  useEffect(() => saveLocal("super-murah-products", products), [products]);
  useEffect(
    () => saveLocal("super-murah-category-images", categoryImages),
    [categoryImages],
  );
  useEffect(() => {
    if (promotionImage) saveLocal("super-murah-promotion", promotionImage);
    else localStorage.removeItem("super-murah-promotion");
  }, [promotionImage]);
  useEffect(() => {
    if (lowerPromotionImage)
      saveLocal("super-murah-lower-promotion", lowerPromotionImage);
    else localStorage.removeItem("super-murah-lower-promotion");
  }, [lowerPromotionImage]);
  useEffect(
    () => saveLocal("super-murah-categories", categories),
    [categories],
  );
  useEffect(() => {
    const syncStorefront = (event: StorageEvent) => {
      if (event.key === "super-murah-promotion")
        setPromotionImage(event.newValue || "");
      if (event.key === "super-murah-lower-promotion")
        setLowerPromotionImage(event.newValue || "");
      if (event.key === "super-murah-category-images")
        setCategoryImages(event.newValue ? JSON.parse(event.newValue) : {});
      if (event.key === "super-murah-categories")
        setCategories(event.newValue ? JSON.parse(event.newValue) : []);
      if (event.key === "super-murah-products")
        setProducts(event.newValue ? JSON.parse(event.newValue) : []);
    };
    window.addEventListener("storage", syncStorefront);
    return () => window.removeEventListener("storage", syncStorefront);
  }, []);
  const filteredProducts =
    activeCategory === "Semua"
      ? products
      : products.filter((product) => product.category === activeCategory);
  const publicFilteredProducts = filteredProducts.filter((product) =>
    publicSearch.trim().length < 2
      ? true
      : `${product.name} ${product.category}`
        .toLowerCase()
        .includes(publicSearch.trim().toLowerCase()),
  );
  const productsPerPage = 12;
  const totalPublicPages = Math.max(
    1,
    Math.ceil(publicFilteredProducts.length / productsPerPage),
  );
  const pageWindowStart =
    publicPage <= 10
      ? 1
      : publicPage % 10 === 0
        ? publicPage
        : Math.floor((publicPage - 1) / 10) * 10 + 1;
  const pageWindowEnd = Math.min(totalPublicPages, pageWindowStart + 9);
  const visiblePageNumbers = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index,
  );
  const visibleProducts = publicFilteredProducts.slice(
    (publicPage - 1) * productsPerPage,
    publicPage * productsPerPage,
  );
  const adminFilteredProducts =
    adminSearch.trim().length < 2
      ? products
      : products.filter((product) =>
        `${product.name} ${product.category}`
          .toLowerCase()
          .includes(adminSearch.trim().toLowerCase()),
      );
  useEffect(() => setPublicPage(1), [activeCategory, publicSearch]);
  const cartItems = products.filter((product) => (cart[product.id] || 0) > 0);
  const totalQuantity = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0,
  );
  const getPrice = (
    product: Product,
    quantity: number,
    orderQuantity = quantity,
  ) =>
    orderQuantity >= 36
      ? priceNumber(product.superWholesale)
      : orderQuantity >= 6
        ? priceNumber(product.wholesale)
        : priceNumber(product.retail);
  const addToCart = (product: Product) =>
    setCart((items) => ({
      ...items,
      [product.id]: (items[product.id] || 0) + 1,
    }));
  const changeCartQuantity = (id: number, quantity: number) =>
    setCart((items) => {
      const next = { ...items };
      if (quantity <= 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  const whatsapp = () =>
    window.open(
      "https://wa.me/6285755463065?text=Halo%20SUPER%20MURAH%20KUPANG%2C%20saya%20ingin%20bertanya%20tentang%20produk.",
      "_blank",
    );
  const checkout = () => {
    if (!cartItems.length) return;
    const lines = cartItems.map((product) => {
      const quantity = cart[product.id];
      return `- ${product.name} (${quantity} pcs) x ${formatRupiah(getPrice(product, quantity, totalQuantity))} = ${formatRupiah(getPrice(product, quantity, totalQuantity) * quantity)}`;
    });
    const total = cartItems.reduce(
      (sum, product) =>
        sum +
        getPrice(product, cart[product.id], totalQuantity) * cart[product.id],
      0,
    );
    const tier =
      totalQuantity >= 36
        ? "Super Grosir"
        : totalQuantity >= 6
          ? "Grosir"
          : "Ecer";
    const message = `Halo SUPER MURAH KUPANG, saya ingin checkout:\n\n${lines.join("\n")}\n\nTotal barang: ${totalQuantity} pcs\nKategori harga: ${tier}\nTotal belanja: ${formatRupiah(total)}\n\nNama pemesan: `;
    window.open(
      `https://wa.me/6285755463065?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };
  const updateLogin = (event: ChangeEvent<HTMLInputElement>) =>
    setLogin({ ...login, [event.target.name]: event.target.value });
  const submitLogin = (event: FormEvent) => {
    event.preventDefault();
    if (login.username === "Jinbee123" && login.password === "RTZKing545601") {
      sessionStorage.setItem("super-murah-admin", "true");
      setIsAdmin(true);
      setLoginError("");
    } else setLoginError("Username atau password belum sesuai.");
  };
  const openEditor = (product?: Product) => {
    setEditing(product ?? null);
    setForm(product ? { ...product } : emptyProduct);
    setEditorOpen(true);
  };
  const closeEditor = () => {
    setEditing(null);
    setForm(emptyProduct);
    setEditorOpen(false);
  };
  const saveProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.image) return;
    if (editing)
      setProducts(
        products.map((product) =>
          product.id === editing.id ? { ...form, id: editing.id } : product,
        ),
      );
    else setProducts([...products, { ...form, id: Date.now() }]);
    closeEditor();
  };
  const removeProduct = (id: number) =>
    setProducts(products.filter((product) => product.id !== id));
  const removeEditingProduct = () => {
    if (!editing) return;
    if (window.confirm(`Hapus produk "${editing.name}" dari katalog?`)) {
      removeProduct(editing.id);
      closeEditor();
    }
  };
  const addCategory = (event: FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (name && !categories.includes(name))
      setCategories([...categories, name]);
    setCategoryName("");
  };
  const removeCategory = (name: string) => {
    if (products.some((product) => product.category === name)) return;
    setCategories(categories.filter((category) => category !== name));
    setCategoryImages((images) => {
      const nextImages = { ...images };
      delete nextImages[name];
      return nextImages;
    });
  };
  const changeProductCategory = (id: number, category: string) =>
    setProducts(
      products.map((product) =>
        product.id === id ? { ...product, category } : product,
      ),
    );
  const uploadCategoryImage = (
    category: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    compressImage(file).then((image) =>
      setCategoryImages((images) => ({ ...images, [category]: image })),
    );
  };
  const removeCategoryImage = (category: string) => {
    setCategoryImages((images) => {
      const nextImages = { ...images };
      delete nextImages[category];
      return nextImages;
    });
  };
  const uploadPromotionImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    compressImage(file).then(setPromotionImage);
  };
  const uploadLowerPromotionImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    compressImage(file).then(setLowerPromotionImage);
  };
  const importExcel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const workbook = XLSX.read(loadEvent.target?.result, { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[workbook.SheetNames[0]],
      );
      const imported = rows
        .map((row, index) => {
          const values = Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key.toLowerCase().replace(/[\s_-]/g, ""),
              value,
            ]),
          );
          const category = String(values.kategori || "Dapur");
          return {
            id: Date.now() + index,
            name: String(values.namabarang || values.nama || ""),
            category,
            retail: String(values.hargaecer || values.ecer || ""),
            wholesale: String(values.hargagrosir || values.grosir || ""),
            superWholesale: String(
              values.hargasupergrosir || values.supergrosir || "",
            ),
            image: String(values.gambar || values.image || ""),
          };
        })
        .filter((product) => product.name);
      setProducts([...products, ...imported]);
      setCategories([
        ...new Set([
          ...categories,
          ...imported.map((product) => product.category),
        ]),
      ]);
      event.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };
  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, image: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <main>
      <div className="announcement">
        Pusat grosir perabot rumah tangga terpercaya di Kupang{" "}
        <ArrowRight size={15} />
      </div>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="SUPER MURAH KUPANG home">
          <img
            className="store-logo"
            src={storeLogo}
            alt="Logo SUPER MURAH KUPANG"
          />
          <span>SUPER</span> MURAH<span className="brand-dot">.</span>
          <small>KUPANG</small>
        </a>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#koleksi" onClick={() => setMenuOpen(false)}>
            Koleksi <ChevronDown size={15} />
          </a>
          <a href="#unggulan" onClick={() => setMenuOpen(false)}>
            Harga Grosir
          </a>
          <a href="#tentang" onClick={() => setMenuOpen(false)}>
            Tentang Kami
          </a>
        </div>
        <div className="nav-actions">
          <button className="admin-link" onClick={() => setAdminOpen(true)}>
            <LogIn size={16} /> Admin
          </button>
          <button className="order-btn" onClick={whatsapp}>
            Pesan via WhatsApp <ArrowRight size={16} />
          </button>
          <button
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Buka menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>
      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Grosir perabot rumah tangga Kupang</p>
          <h1>
            Harga super murah,
            <br />
            <em>pilihan</em> serba lengkap.
          </h1>
          <p className="hero-text">
            Belanja perabot rumah tangga untuk kebutuhan rumah, toko, kos, dan
            usaha Anda. Ada harga ecer, grosir, dan super grosir.
          </p>
          <div className="hero-cta">
            <button
              className="primary-btn"
              onClick={() =>
                document
                  .getElementById("unggulan")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Lihat katalog <ArrowRight size={17} />
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
              promotionImage ||
              "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=90"
            }
            alt={
              promotionImage
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
            <em>cocok untuk toko dan usaha.</em>”
          </div>
        </div>
      </section>
      <section className="section shell" id="koleksi">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cari berdasarkan kebutuhan</p>
            <h2>
              Lengkapi setiap
              <br />
              <em>sudut rumah.</em>
            </h2>
          </div>
          <p className="section-intro">
            Katalog perabot fungsional dengan pilihan harga yang transparan
            untuk pembelian satuan sampai dalam jumlah besar.
          </p>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => {
            const visual = defaultCategories[index % defaultCategories.length];
            return (
              <button
                className={`category-card category-${index % 4}`}
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  document
                    .getElementById("unggulan")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <img
                  src={categoryImages[category] || visual.image}
                  alt={category}
                />
                <span>{category}</span>
                <ArrowRight size={19} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="featured section" id="unggulan">
        <div className="shell">
          <div className="section-heading featured-heading">
            <div>
              <p className="eyebrow">Katalog terbaru</p>
              <h2>
                Harga <em>terbaik.</em>
              </h2>
            </div>
            <div className="catalog-actions">
              <label className="public-search catalog-search">
                <Search size={18} />
                <input
                  value={publicSearch}
                  onChange={(event) => setPublicSearch(event.target.value)}
                  placeholder="Cari nama barang atau kategori..."
                  aria-label="Cari nama atau kategori produk"
                />
                {publicSearch && (
                  <button
                    type="button"
                    onClick={() => setPublicSearch("")}
                    aria-label="Hapus pencarian produk"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <div className="filters">
                {["Semua", ...categories].map((category) => (
                  <button
                    className={activeCategory === category ? "active" : ""}
                    key={category}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="price-legend">
            <span>
              <i className="retail-dot" /> Ecer
            </span>
            <span>
              <i className="wholesale-dot" /> Grosir
            </span>
            <span>
              <i className="super-dot" /> Super grosir
            </span>
          </div>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  {product.badge && (
                    <span className="badge">{product.badge}</span>
                  )}
                  <button
                    className="product-photo-button"
                    onClick={() => setSelectedProduct(product)}
                    aria-label={`Lihat detail ${product.name}`}
                  >
                    <img
                      src={
                        product.image ||
                        categoryImages[product.category] ||
                        defaultCategories[0].image
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
                          (cart[product.id] || 0) - 1,
                        )
                      }
                      disabled={!cart[product.id]}
                      aria-label={`Kurangi ${product.name}`}
                    >
                      −
                    </button>
                    <span>{cart[product.id] || 0}</span>
                    <button
                      className="quick-view"
                      onClick={() => addToCart(product)}
                      aria-label={`Tambah ${product.name} ke keranjang`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="product-info">
                  <div>
                    <p className="product-category">{product.category}</p>
                    <h3>{product.name}</h3>
                  </div>
                  <div className="price-stack">
                    <strong>
                      {formatRupiah(
                        getPrice(
                          product,
                          cart[product.id] || 1,
                          totalQuantity || 1,
                        ),
                      )}
                    </strong>
                    <span>{product.wholesale} grosir</span>
                    <span>{product.superWholesale} super</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {publicFilteredProducts.length === 0 && (
            <p className="empty-catalog">
              Produk tidak ditemukan. Coba kata kunci atau kategori lain.
            </p>
          )}
          {totalPublicPages > 1 && (
            <nav className="pagination" aria-label="Halaman katalog">
              <button
                onClick={() => setPublicPage(Math.max(1, publicPage - 1))}
                disabled={publicPage === 1}
                aria-label="Halaman sebelumnya"
              >
                ‹
              </button>
              {visiblePageNumbers.map((page) => (
                <button
                  key={page}
                  className={publicPage === page ? "active" : ""}
                  onClick={() => setPublicPage(page)}
                  aria-label={`Halaman ${page}`}
                  aria-current={publicPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() =>
                  setPublicPage(Math.min(totalPublicPages, publicPage + 1))
                }
                disabled={publicPage === totalPublicPages}
                aria-label="Halaman berikutnya"
              >
                ›
              </button>
            </nav>
          )}
          <div className="cart-bar">
            <div>
              <strong>{totalQuantity} pcs di keranjang</strong>
              <span>
                {totalQuantity >= 36
                  ? "Harga super grosir aktif"
                  : totalQuantity >= 6
                    ? "Harga grosir aktif"
                    : "Tambah 6 pcs untuk harga grosir"}
              </span>
            </div>
            <strong>
              {formatRupiah(
                cartItems.reduce(
                  (sum, product) =>
                    sum +
                    getPrice(product, cart[product.id], totalQuantity) *
                    cart[product.id],
                  0,
                ),
              )}
            </strong>
            <button
              className="primary-btn"
              onClick={checkout}
              disabled={!cartItems.length}
            >
              Checkout via WhatsApp <MessageCircle size={17} />
            </button>
          </div>
        </div>
      </section>
      <section className="benefits shell" id="tentang">
        <div className="benefit-photo">
          <img
            src={
              lowerPromotionImage ||
              "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=85"
            }
            alt={
              lowerPromotionImage
                ? "Promosi bawah SUPER MURAH KUPANG"
                : "Detail perabot rumah tangga"
            }
          />
        </div>
        <div className="benefit-copy">
          <p className="eyebrow">Kenapa SUPER MURAH KUPANG?</p>
          <h2>
            Belanja mudah,
            <br />
            <em>untung lebih.</em>
          </h2>
          <p>
            Kami membantu rumah tangga, pemilik toko, dan pelaku usaha
            mendapatkan perabot berkualitas dengan harga yang jelas sejak awal.
          </p>
          <div className="benefit-list">
            <div>
              <Truck size={21} />
              <span>
                <strong>Pengiriman dari Kupang</strong>
                <small>Stok aman dan siap dikirim.</small>
              </span>
            </div>
            <div>
              <Package size={21} />
              <span>
                <strong>Harga bertingkat</strong>
                <small>Ecer, grosir, sampai super grosir.</small>
              </span>
            </div>
            <div>
              <ShieldCheck size={21} />
              <span>
                <strong>Produk pilihan</strong>
                <small>Cocok untuk rumah dan kebutuhan usaha.</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="closing">
        <div className="shell closing-inner">
          <p className="eyebrow">Mulai belanja hari ini</p>
          <h2>
            Harga murah untuk
            <br />
            <em>semua kebutuhan.</em>
          </h2>
          <button className="primary-btn light" onClick={whatsapp}>
            Konsultasi stok sekarang <MessageCircle size={18} />
          </button>
        </div>
      </section>
      <footer className="footer">
        <div className="footer-inner shell">

          {/* BRAND */}
          <a className="footer-brand" href="#top">
            <span>SUPER</span> MURAH<span className="brand-dot">.</span>
            <small>KUPANG</small>
          </a>

          {/* DESCRIPTION */}
          <p className="footer-description">
            Perabot lengkap, harga super murah.
          </p>

          {/* WHATSAPP */}
          <a
            className="footer-whatsapp"
            href="https://wa.me/6285755463065"
            target="_blank"
            rel="noreferrer"
          >
            <span className="footer-label">WhatsApp</span>
            <span>085755463065</span>
          </a>

          {/* SOCIAL MEDIA */}
          <div className="footer-social">
            <span className="footer-label">Ikuti kami</span>

            <div className="social-links">

              {/* INSTAGRAM */}
              <a
                href="https://instagram.com/supermurah_kupang"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram SUPER MURAH KUPANG"
                title="Instagram SUPER MURAH KUPANG"
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

                <span>@supermurah_kupang</span>
              </a>

              {/* TIKTOK */}
              <a
                href="https://tiktok.com/@super.murah.kupang"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok SUPER MURAH KUPANG"
                title="TikTok SUPER MURAH KUPANG"
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

                <span>@super.murah.kupang</span>
              </a>

            </div>
          </div>

          {/* COPYRIGHT */}
          <small className="footer-copyright">
            © 2024 SUPER MURAH KUPANG
          </small>

        </div>
      </footer>
      {selectedProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="product-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setSelectedProduct(null)}
            >
              <X />
            </button>
            <img
              src={
                selectedProduct.image ||
                categoryImages[selectedProduct.category] ||
                defaultCategories[0].image
              }
              alt={selectedProduct.name}
            />
            <div>
              <p className="product-category">{selectedProduct.category}</p>
              <h2>{selectedProduct.name}</h2>
              <p className="detail-description">
                {selectedProduct.description ||
                  "Produk pilihan SUPER MURAH KUPANG untuk kebutuhan rumah dan usaha Anda."}
              </p>
              <div className="detail-price">
                <span>Mulai dari</span>
                <strong>
                  {formatRupiah(
                    getPrice(selectedProduct, cart[selectedProduct.id] || 1),
                  )}
                </strong>
              </div>
              <div className="detail-actions">
                <button
                  className="secondary-btn"
                  onClick={() => addToCart(selectedProduct)}
                >
                  <Plus size={16} /> Tambah 1 pcs
                </button>
                <span>{cart[selectedProduct.id] || 0} pcs di keranjang</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {adminOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !isAdmin && setAdminOpen(false)}
        >
          <div
            className={`admin-modal ${isAdmin ? "dashboard-modal" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            {!isAdmin ? (
              <form onSubmit={submitLogin} className="login-panel">
                <button
                  type="button"
                  className="close-modal"
                  onClick={() => setAdminOpen(false)}
                >
                  <X />
                </button>
                <div className="admin-mark">
                  <LogIn />
                </div>
                <p className="eyebrow">Area pengelola</p>
                <h2>
                  Login <em>admin.</em>
                </h2>
                <p>Kelola foto katalog dan harga produk SUPER MURAH KUPANG.</p>
                <label>
                  Username
                  <input
                    name="username"
                    value={login.username}
                    onChange={updateLogin}
                    placeholder="Masukkan username"
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    value={login.password}
                    onChange={updateLogin}
                    placeholder="Masukkan password"
                  />
                </label>
                {loginError && <div className="login-error">{loginError}</div>}
                <button className="primary-btn login-button">
                  Masuk ke dashboard <ArrowRight size={17} />
                </button>
              </form>
            ) : (
              <div className="dashboard">
                <aside className="dashboard-sidebar">
                  <p className="sidebar-label">Menu admin</p>
                  <button
                    className={adminSection === "catalog" ? "active" : ""}
                    onClick={() => setAdminSection("catalog")}
                  >
                    <LayoutDashboard size={17} /> Katalog produk
                  </button>
                  <button
                    className={adminSection === "promotion" ? "active" : ""}
                    onClick={() => setAdminSection("promotion")}
                  >
                    <Megaphone size={17} /> Halaman promosi
                  </button>
                  <button
                    className={adminSection === "categories" ? "active" : ""}
                    onClick={() => setAdminSection("categories")}
                  >
                    <Tags size={17} /> Kelola kategori
                  </button>
                </aside>
                <div className="dashboard-content">
                  <div className="dashboard-top">
                    <div>
                      <p className="eyebrow">Dashboard admin</p>
                      <h2>
                        Kelola <em>katalog.</em>
                      </h2>
                    </div>
                    <div className="dashboard-actions">
                      <label className="import-btn">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={importExcel}
                        />
                        <Package size={16} /> Import Excel
                      </label>
                      <button
                        className="secondary-btn"
                        onClick={() => openEditor()}
                      >
                        <Plus size={16} /> Tambah produk
                      </button>
                      <button
                        className="logout-btn"
                        onClick={() => {
                          sessionStorage.removeItem("super-murah-admin");
                          setIsAdmin(false);
                        }}
                      >
                        <LogOut size={16} /> Keluar
                      </button>
                      <button
                        className="close-modal"
                        onClick={() => setAdminOpen(false)}
                      >
                        <X />
                      </button>
                    </div>
                  </div>
                  <p className="dashboard-desc">
                    Import ribuan barang sekaligus, lalu atur kategori dan tiga
                    tingkat harga.
                  </p>
                  {adminSection === "catalog" && (
                    <>
                      <div className="admin-search">
                        <Search size={17} />
                        <input
                          value={adminSearch}
                          onChange={(event) =>
                            setAdminSearch(event.target.value)
                          }
                          placeholder="Cari nama atau kategori barang..."
                          aria-label="Cari nama atau kategori barang"
                        />
                        {adminSearch && (
                          <button
                            type="button"
                            onClick={() => setAdminSearch("")}
                            aria-label="Hapus pencarian"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <small>
                          {adminSearch.trim().length >= 2
                            ? `${adminFilteredProducts.length} produk ditemukan`
                            : "Ketik minimal 2 huruf untuk mencari"}
                        </small>
                      </div>
                    </>
                  )}
                  {adminSection === "promotion" && (
                    <div className="admin-settings promotion-settings">
                      <div className="settings-copy">
                        <strong>Gambar utama / promosi</strong>
                        <small>
                          Gambar ini menggantikan gambar utama di hero halaman
                          depan.
                        </small>
                      </div>
                      <label className="settings-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={uploadPromotionImage}
                        />
                        {promotionImage ? (
                          <img src={promotionImage} alt="Promosi saat ini" />
                        ) : (
                          <ImagePlus size={18} />
                        )}
                        <span>
                          {promotionImage
                            ? "Ganti gambar utama"
                            : "Upload gambar utama"}
                        </span>
                      </label>
                      {promotionImage && (
                        <button
                          className="remove-logo"
                          onClick={() => setPromotionImage("")}
                        >
                          Hapus gambar utama
                        </button>
                      )}
                      <div className="admin-settings lower-promotion-settings">
                        <div className="settings-copy">
                          <strong>Gambar promosi bawah</strong>
                          <small>
                            Gambar ini menggantikan foto di bagian bawah halaman
                            depan.
                          </small>
                        </div>
                        <label className="settings-upload">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={uploadLowerPromotionImage}
                          />
                          {lowerPromotionImage ? (
                            <img
                              src={lowerPromotionImage}
                              alt="Promosi bawah saat ini"
                            />
                          ) : (
                            <ImagePlus size={18} />
                          )}
                          <span>
                            {lowerPromotionImage
                              ? "Ganti gambar bawah"
                              : "Upload gambar bawah"}
                          </span>
                        </label>
                        {lowerPromotionImage && (
                          <button
                            className="remove-logo"
                            onClick={() => setLowerPromotionImage("")}
                          >
                            Hapus gambar bawah
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {adminSection === "categories" && (
                    <div className="category-manager">
                      <div>
                        <strong>Kelola kategori dan gambar</strong>
                        <small>
                          Setiap gambar tersimpan otomatis dan langsung tampil
                          di halaman depan.
                        </small>
                      </div>
                      <form onSubmit={addCategory}>
                        <input
                          value={categoryName}
                          onChange={(event) =>
                            setCategoryName(event.target.value)
                          }
                          placeholder="Nama kategori baru"
                        />
                        <button className="secondary-btn">
                          <Plus size={15} /> Tambah
                        </button>
                      </form>
                      <div className="category-editor-grid">
                        {categories.map((category) => (
                          <div className="category-editor-card" key={category}>
                            <img
                              src={
                                categoryImages[category] ||
                                defaultCategories.find(
                                  (item) => item.label === category,
                                )?.image ||
                                defaultCategories[0].image
                              }
                              alt={`Gambar ${category}`}
                            />
                            <strong>{category}</strong>
                            <div className="category-editor-actions">
                              <label className="edit-image-btn">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) =>
                                    uploadCategoryImage(category, event)
                                  }
                                />
                                <ImagePlus size={14} />{" "}
                                {categoryImages[category]
                                  ? "Ganti gambar"
                                  : "Tambah gambar"}
                              </label>
                              {categoryImages[category] && (
                                <button
                                  type="button"
                                  className="remove-image-btn"
                                  onClick={() => removeCategoryImage(category)}
                                >
                                  Hapus gambar
                                </button>
                              )}
                              <button
                                type="button"
                                className="delete-category-btn"
                                onClick={() => removeCategory(category)}
                                disabled={products.some(
                                  (product) => product.category === category,
                                )}
                                aria-label={`Hapus kategori ${category}`}
                              >
                                <X size={14} /> Hapus kategori
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {adminSection === "catalog" && (
                    <>
                      <div className="import-hint">
                        Format kolom Excel: <strong>Nama Barang</strong>,{" "}
                        <strong>Harga Ecer</strong>,{" "}
                        <strong>Harga Grosir</strong>,{" "}
                        <strong>Harga Super Grosir</strong>,{" "}
                        <strong>Gambar</strong> (URL opsional),{" "}
                        <strong>Kategori</strong> (opsional).
                      </div>
                      <div className="admin-product-list">
                        {adminFilteredProducts.map((product) => (
                          <div className="admin-product-row" key={product.id}>
                            <img
                              src={
                                product.image ||
                                categoryImages[product.category] ||
                                defaultCategories[0].image
                              }
                              alt=""
                            />
                            <div>
                              <strong>{product.name}</strong>
                              <small>
                                {product.retail} / {product.wholesale} /{" "}
                                {product.superWholesale}
                              </small>
                            </div>
                            <select
                              value={product.category}
                              onChange={(event) =>
                                changeProductCategory(
                                  product.id,
                                  event.target.value,
                                )
                              }
                              aria-label={`Kategori ${product.name}`}
                            >
                              {categories.map((category) => (
                                <option key={category}>{category}</option>
                              ))}
                            </select>
                            <button
                              className="edit-btn"
                              onClick={() => openEditor(product)}
                            >
                              <Pencil size={15} /> Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => removeProduct(product.id)}
                              aria-label={`Hapus ${product.name}`}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
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
              <div>
                <p className="eyebrow">
                  {editing ? "Edit katalog" : "Katalog baru"}
                </p>
                <h2>{editing ? "Ubah produk." : "Tambah produk."}</h2>
              </div>
              <button
                type="button"
                className="close-modal"
                onClick={closeEditor}
              >
                <X />
              </button>
            </div>
            <div className="editor-grid">
              <label>
                Nama produk
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                  placeholder="Contoh: Meja Lipat Serbaguna"
                />
              </label>
              <label>
                Kategori
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Harga ecer
                <input
                  value={form.retail}
                  onChange={(event) =>
                    setForm({ ...form, retail: event.target.value })
                  }
                  placeholder="Rp0"
                />
              </label>
              <label>
                Harga grosir
                <input
                  value={form.wholesale}
                  onChange={(event) =>
                    setForm({ ...form, wholesale: event.target.value })
                  }
                  placeholder="Rp0"
                />
              </label>
              <label>
                Harga super grosir
                <input
                  value={form.superWholesale}
                  onChange={(event) =>
                    setForm({ ...form, superWholesale: event.target.value })
                  }
                  placeholder="Rp0"
                />
              </label>
              <label>
                Label (opsional)
                <input
                  value={form.badge ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, badge: event.target.value })
                  }
                  placeholder="Terlaris"
                />
              </label>
              <label className="description-field">
                Deskripsi singkat
                <textarea
                  value={form.description ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Contoh: Rak serbaguna untuk menyimpan barang di rumah."
                />
              </label>
            </div>
            <label className="image-upload">
              <input type="file" accept="image/*" onChange={uploadImage} />
              <span>
                <ImagePlus size={22} />
                {form.image ? "Ganti gambar katalog" : "Upload gambar katalog"}
              </span>
              {form.image && <img src={form.image} alt="Preview katalog" />}
            </label>
            <button className="primary-btn login-button">
              Simpan katalog <ArrowRight size={17} />
            </button>
            {editing && (
              <button
                type="button"
                className="delete-product-editor"
                onClick={removeEditingProduct}
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
