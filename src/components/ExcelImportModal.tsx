import { useState, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { CheckCircle2, AlertTriangle, XCircle, Upload, ArrowRight, X, FileSpreadsheet, Loader2 } from "lucide-react";
import { Product, Category } from "../types";
import { SupabaseClient } from "@supabase/supabase-js";

interface ExcelRow {
  rowNumber: number;
  product_code: string;
  name: string;
  category: string;
  retail: string;
  wholesale: string;
  super_wholesale: string;
  image: string;
  badge: string;
  description: string;
  status: "valid_new" | "valid_update" | "warning" | "invalid";
  messages: string[];
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  existingProducts: Product[];
  categories: Category[];
  supabase: SupabaseClient;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
  existingProducts,
  categories,
  supabase,
}: ExcelImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const [parsedRows, setParsedRows] = useState<ExcelRow[]>([]);
  const [preserveExistingImages, setPreserveExistingImages] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [autoAddCategories, setAutoAddCategories] = useState(true);

  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState({ inserted: 0, updated: 0, failed: 0 });
  const [filterStatus, setFilterStatus] = useState<"all" | "errors" | "updates">("all");

  if (!isOpen) return null;

  const normalizeText = (val: unknown) =>
    String(val ?? "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook.SheetNames.length) {
          alert("File Excel tidak memiliki sheet yang valid.");
          return;
        }

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (!rawRows.length) {
          alert("File Excel tidak memiliki data.");
          return;
        }

        const existingByCode = new Map<string, Product>();
        const existingByName = new Map<string, Product>();
        for (const p of existingProducts) {
          const code = String(p.product_code ?? "").trim().toLowerCase();
          const name = normalizeText(p.name);
          if (code) existingByCode.set(code, p);
          if (name) existingByName.set(name, p);
        }

        const knownCategories = new Set(categories.map((c) => c.name.trim().toLowerCase()));
        const seenCodesInFile = new Set<string>();
        const seenNamesInFile = new Set<string>();

        const evaluatedRows: ExcelRow[] = [];

        rawRows.forEach((row, index) => {
          const normalizedKeys = Object.fromEntries(
            Object.entries(row).map(([k, v]) => [
              k.toLowerCase().replace(/[\s_-]/g, ""),
              v,
            ]),
          );

          const product_code = String(
            normalizedKeys.kodebarang ??
              normalizedKeys.kode ??
              normalizedKeys.kodeproduk ??
              normalizedKeys.sku ??
              normalizedKeys.productcode ??
              "",
          ).trim();

          const name = String(
            normalizedKeys.namabarang ??
              normalizedKeys.nama ??
              normalizedKeys.title ??
              "",
          ).trim();

          const category =
            String(
              normalizedKeys.kategori ??
                normalizedKeys.category ??
                "Dapur",
            ).trim() || "Dapur";

          const retail = String(
            normalizedKeys.hargaecer ??
              normalizedKeys.ecer ??
              normalizedKeys.retail ??
              "",
          ).trim();

          const wholesale = String(
            normalizedKeys.hargagrosir ??
              normalizedKeys.grosir ??
              normalizedKeys.wholesale ??
              "",
          ).trim();

          const super_wholesale = String(
            normalizedKeys.hargasupergrosir ??
              normalizedKeys.supergrosir ??
              normalizedKeys.superwholesale ??
              "",
          ).trim();

          const image = String(
            normalizedKeys.gambar ??
              normalizedKeys.image ??
              normalizedKeys.foto ??
              "",
          ).trim();

          const badge = String(
            normalizedKeys.badge ??
              normalizedKeys.label ??
              normalizedKeys.tag ??
              "",
          ).trim();

          const description = String(
            normalizedKeys.deskripsi ??
              normalizedKeys.description ??
              normalizedKeys.keterangan ??
              "",
          ).trim();

          const normName = normalizeText(name);
          const normCode = product_code.toLowerCase();

          const messages: string[] = [];
          let status: ExcelRow["status"] = "valid_new";

          if (!normName) {
            status = "invalid";
            messages.push("Nama barang kosong.");
          } else {
            // Check duplicates in file
            if (normCode && seenCodesInFile.has(normCode)) {
              status = "warning";
              messages.push("Kode barang duplikat di file ini.");
            } else if (normCode) {
              seenCodesInFile.add(normCode);
            }

            if (seenNamesInFile.has(normName)) {
              status = "warning";
              messages.push("Nama barang terulang di file ini.");
            } else {
              seenNamesInFile.add(normName);
            }

            // Check existing in database
            const existingMatch = (normCode && existingByCode.get(normCode)) || existingByName.get(normName);
            if (existingMatch) {
              status = status === "warning" ? "warning" : "valid_update";
              messages.push(`Update produk existing (ID #${existingMatch.id}: ${existingMatch.name}).`);
            }

            // Check prices
            if (!retail && !wholesale) {
              status = "warning";
              messages.push("Harga ecer & grosir masih kosong.");
            }

            // Check category
            if (!knownCategories.has(category.toLowerCase())) {
              messages.push(`Kategori baru: "${category}".`);
            }
          }

          evaluatedRows.push({
            rowNumber: index + 2,
            product_code,
            name,
            category,
            retail,
            wholesale,
            super_wholesale,
            image,
            badge,
            description,
            status,
            messages,
          });
        });

        setParsedRows(evaluatedRows);
        setStep("preview");
      } catch (err: any) {
        console.error("Gagal membaca file Excel:", err);
        alert(`Gagal memproses file Excel: ${err?.message || "Format tidak valid"}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.status !== "invalid");
    if (!validRows.length) {
      alert("Tidak ada baris valid yang dapat diimpor.");
      return;
    }

    setStep("importing");
    setImportProgress({ current: 0, total: validRows.length });

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    const existingByCode = new Map<string, Product>();
    const existingByName = new Map<string, Product>();
    for (const p of existingProducts) {
      const code = String(p.product_code ?? "").trim().toLowerCase();
      const name = normalizeText(p.name);
      if (code) existingByCode.set(code, p);
      if (name) existingByName.set(name, p);
    }

    const newCategoriesToInsert = new Set<string>();
    const existingCategoryNames = new Set(categories.map((c) => c.name.trim().toLowerCase()));

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress({ current: i + 1, total: validRows.length });

      const normCode = row.product_code.toLowerCase();
      const normName = normalizeText(row.name);

      const existingMatch = (normCode && existingByCode.get(normCode)) || existingByName.get(normName);

      try {
        if (existingMatch && updateExisting) {
          // UPDATE: Preserve image/badge/description if empty in Excel
          const finalImage = row.image || (preserveExistingImages ? existingMatch.image : "");
          const finalBadge = row.badge || existingMatch.badge || null;
          const finalDescription = row.description || existingMatch.description || null;

          const payload = {
            product_code: row.product_code || existingMatch.product_code || null,
            name: row.name || existingMatch.name,
            category: row.category || existingMatch.category,
            retail: row.retail || existingMatch.retail,
            wholesale: row.wholesale || existingMatch.wholesale,
            super_wholesale: row.super_wholesale || existingMatch.superWholesale,
            image: finalImage,
            badge: finalBadge,
            description: finalDescription,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from("products").update(payload).eq("id", existingMatch.id);
          if (error) throw error;
          updated++;
        } else if (!existingMatch) {
          // INSERT
          const payload = {
            product_code: row.product_code || null,
            name: row.name,
            category: row.category,
            retail: row.retail,
            wholesale: row.wholesale,
            super_wholesale: row.super_wholesale,
            image: row.image,
            badge: row.badge || null,
            description: row.description || null,
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabase.from("products").insert(payload).select().single();
          if (error || !data) throw error || new Error("Gagal insert produk");
          inserted++;

          if (row.category && !existingCategoryNames.has(row.category.toLowerCase())) {
            newCategoriesToInsert.add(row.category);
          }
        }
      } catch (err) {
        console.error("Gagal mengimpor produk:", row.name, err);
        failed++;
      }
    }

    // Auto-add new categories if enabled
    if (autoAddCategories && newCategoriesToInsert.size > 0) {
      try {
        const catPayload = Array.from(newCategoriesToInsert).map((name) => ({
          name,
          image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
        }));
        await supabase.from("categories").insert(catPayload);
      } catch (catErr) {
        console.warn("Gagal membuat kategori baru secara otomatis:", catErr);
      }
    }

    setImportResults({ inserted, updated, failed });
    setStep("complete");
    await onSuccess();
  };

  const validCount = parsedRows.filter((r) => r.status === "valid_new" || r.status === "valid_update").length;
  const warningCount = parsedRows.filter((r) => r.status === "warning").length;
  const invalidCount = parsedRows.filter((r) => r.status === "invalid").length;

  const displayedRows = parsedRows.filter((r) => {
    if (filterStatus === "errors") return r.status === "invalid" || r.status === "warning";
    if (filterStatus === "updates") return r.status === "valid_update";
    return true;
  });

  return (
    <div className="editor-overlay" onClick={onClose}>
      <div
        className="excel-modal-container"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "95%",
          maxWidth: "1000px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#059669",
                display: "grid",
                placeItems: "center",
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--ink)", fontWeight: 700 }}>
                Import Katalog Excel
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                Alur: Upload → Preview & Validasi → Eksekusi Aman
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              color: "var(--muted)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body content based on step */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {step === "upload" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div
                style={{
                  border: "2px dashed #d1d5db",
                  borderRadius: "16px",
                  padding: "50px 20px",
                  background: "#f9fafb",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
                <Upload size={48} style={{ color: "#9ca3af", margin: "0 auto 16px" }} />
                <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "var(--ink)" }}>
                  Pilih file Excel katalog produk
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                  Mendukung format .xlsx, .xls, atau .csv. Baris pertama berisi judul kolom.
                </p>
                <div
                  style={{
                    display: "inline-block",
                    marginTop: "20px",
                    padding: "10px 20px",
                    background: "var(--ink)",
                    color: "white",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Pilih Berkas
                </div>
              </div>

              <div
                style={{
                  marginTop: "24px",
                  textAlign: "left",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong>Format Kolom yang Dikenali:</strong>
                <p style={{ margin: "6px 0 0" }}>
                  • <code>Kode Barang</code> (opsional, untuk identifikasi SKU)
                  <br />
                  • <code>Nama Barang</code> (wajib diisi)
                  <br />
                  • <code>Kategori</code> (opsional, bawaan: "Dapur")
                  <br />
                  • <code>Harga Ecer</code>, <code>Harga Grosir</code>, <code>Harga Super Grosir</code>
                  <br />
                  • <code>Gambar</code> (URL gambar, opsional), <code>Badge</code>, <code>Deskripsi</code>
                </p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              {/* Validation Summary Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "14px",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#16a34a" }}>
                    <CheckCircle2 size={18} />
                    <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Valid</span>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#166534", marginTop: "4px" }}>
                    {validCount}
                  </div>
                  <span style={{ fontSize: "12px", color: "#15803d" }}>Siap diimpor</span>
                </div>

                <div
                  style={{
                    background: "#fefce8",
                    border: "1px solid #fef08a",
                    padding: "14px",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ca8a04" }}>
                    <AlertTriangle size={18} />
                    <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Peringatan</span>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#854d0e", marginTop: "4px" }}>
                    {warningCount}
                  </div>
                  <span style={{ fontSize: "12px", color: "#a16207" }}>Duplikat / data kurang</span>
                </div>

                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "14px",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc2626" }}>
                    <XCircle size={18} />
                    <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Tidak Valid</span>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#991b1b", marginTop: "4px" }}>
                    {invalidCount}
                  </div>
                  <span style={{ fontSize: "12px", color: "#b91c1c" }}>Nama kosong / dilewati</span>
                </div>
              </div>

              {/* Import Options */}
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  marginBottom: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "13px",
                  color: "var(--ink)",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={preserveExistingImages}
                    onChange={(e) => setPreserveExistingImages(e.target.checked)}
                  />
                  <span>
                    <strong>Proteksi Gambar:</strong> Jangan hapus foto produk existing jika kolom gambar di Excel kosong
                  </span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                  />
                  <span>
                    <strong>Update Data:</strong> Perbarui harga dan info produk jika kode/nama sudah ada di database
                  </span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autoAddCategories}
                    onChange={(e) => setAutoAddCategories(e.target.checked)}
                  />
                  <span>
                    <strong>Kategori Baru:</strong> Daftarkan kategori baru secara otomatis jika belum ada di database
                  </span>
                </label>
              </div>

              {/* Table Filter Tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid #d1d5db",
                    background: filterStatus === "all" ? "var(--ink)" : "white",
                    color: filterStatus === "all" ? "white" : "var(--ink)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Semua ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("errors")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid #fecaca",
                    background: filterStatus === "errors" ? "#ef4444" : "white",
                    color: filterStatus === "errors" ? "white" : "#b91c1c",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Peringatan & Eror ({warningCount + invalidCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("updates")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid #fed7aa",
                    background: filterStatus === "updates" ? "#f97316" : "white",
                    color: filterStatus === "updates" ? "white" : "#c2410c",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Update Existing ({parsedRows.filter((r) => r.status === "valid_update").length})
                </button>
              </div>

              {/* Preview Table */}
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  overflow: "hidden",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>No</th>
                      <th style={{ padding: "10px" }}>Status</th>
                      <th style={{ padding: "10px" }}>Kode</th>
                      <th style={{ padding: "10px" }}>Nama Produk</th>
                      <th style={{ padding: "10px" }}>Kategori</th>
                      <th style={{ padding: "10px" }}>Harga Ecer</th>
                      <th style={{ padding: "10px" }}>Harga Grosir</th>
                      <th style={{ padding: "10px" }}>Super Grosir</th>
                      <th style={{ padding: "10px" }}>Catatan Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.slice(0, 100).map((row) => (
                      <tr
                        key={row.rowNumber}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background:
                            row.status === "invalid"
                              ? "#fef2f2"
                              : row.status === "warning"
                                ? "#fffbeb"
                                : row.status === "valid_update"
                                  ? "#fff7ed"
                                  : "white",
                        }}
                      >
                        <td style={{ padding: "8px 10px", color: "var(--muted)" }}>#{row.rowNumber}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {row.status === "valid_new" && (
                            <span style={{ color: "#16a34a", fontWeight: 700 }}>Baru</span>
                          )}
                          {row.status === "valid_update" && (
                            <span style={{ color: "#ea580c", fontWeight: 700 }}>Update</span>
                          )}
                          {row.status === "warning" && (
                            <span style={{ color: "#ca8a04", fontWeight: 700 }}>Peringatan</span>
                          )}
                          {row.status === "invalid" && (
                            <span style={{ color: "#dc2626", fontWeight: 700 }}>Invalid</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.product_code || "-"}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.name || "(Kosong)"}</td>
                        <td style={{ padding: "8px 10px" }}>{row.category}</td>
                        <td style={{ padding: "8px 10px" }}>{row.retail || "-"}</td>
                        <td style={{ padding: "8px 10px" }}>{row.wholesale || "-"}</td>
                        <td style={{ padding: "8px 10px" }}>{row.super_wholesale || "-"}</td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>
                          {row.messages.length ? row.messages.join("; ") : "Lengkap"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {displayedRows.length > 100 && (
                <p style={{ fontSize: "11px", color: "var(--muted)", margin: "6px 0 0" }}>
                  Menampilkan 100 baris pertama dari {displayedRows.length} total baris.
                </p>
              )}
            </div>
          )}

          {step === "importing" && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <Loader2 size={40} className="animate-spin" style={{ color: "var(--ink)", margin: "0 auto 16px" }} />
              <h4 style={{ margin: "0 0 8px", fontSize: "18px", color: "var(--ink)" }}>
                Sedang mengimpor produk ke katalog...
              </h4>
              <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: "14px" }}>
                Memproses baris {importProgress.current} dari {importProgress.total} produk
              </p>
              <div
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  height: "8px",
                  background: "#e5e7eb",
                  borderRadius: "999px",
                  margin: "0 auto",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "var(--ink)",
                    width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            </div>
          )}

          {step === "complete" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#15803d",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: "0 0 8px", fontSize: "20px", color: "var(--ink)", fontWeight: 700 }}>
                Import Selesai!
              </h4>
              <p style={{ margin: "0 0 24px", color: "var(--muted)", fontSize: "14px" }}>
                Katalog produk toko berhasil diperbarui di Supabase.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "24px",
                  marginBottom: "30px",
                  fontSize: "14px",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "22px", color: "#16a34a" }}>
                    +{importResults.inserted}
                  </strong>
                  <span style={{ color: "var(--muted)" }}>Produk Baru</span>
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: "22px", color: "#ea580c" }}>
                    {importResults.updated}
                  </strong>
                  <span style={{ color: "var(--muted)" }}>Produk Diupdate</span>
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: "22px", color: "#dc2626" }}>
                    {importResults.failed}
                  </strong>
                  <span style={{ color: "var(--muted)" }}>Gagal</span>
                </div>
              </div>
              <button
                className="primary-btn"
                style={{ margin: "0 auto" }}
                onClick={() => {
                  setStep("upload");
                  onClose();
                }}
              >
                Tutup & Lihat Katalog
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === "preview" && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f9fafb",
            }}
          >
            <button
              className="secondary-btn"
              onClick={() => {
                setStep("upload");
                setParsedRows([]);
              }}
            >
              Ganti File
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="secondary-btn" onClick={onClose}>
                Batal
              </button>
              <button
                className="primary-btn"
                disabled={validCount === 0}
                onClick={handleExecuteImport}
              >
                Mulai Import ({validCount + (updateExisting ? warningCount : 0)} Barang) <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

