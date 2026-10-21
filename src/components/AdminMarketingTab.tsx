import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { Save } from "lucide-react";
import type { MarketingSettings } from "../types";

type Props = {
  settings: MarketingSettings;
  onSaveSettings: (
    settings: MarketingSettings,
  ) => void;

  // Tetap kompatibel dengan pemanggilan pada App.tsx V4.
  [key: string]: unknown;
};

export function AdminMarketingTab({
  settings,
  onSaveSettings,
}: Props) {
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const update = (
    key: keyof MarketingSettings,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage("");
  };

  const save = (event: FormEvent) => {
    event.preventDefault();

    const phone = form.storePhone.replace(/\D/g, "");

    if (phone.length < 9 || phone.length > 15) {
      setMessage(
        "Periksa kembali nomor WhatsApp toko.",
      );
      return;
    }

    if (form.storeMapsUrl.trim()) {
      try {
        const url = new URL(
          form.storeMapsUrl.trim(),
        );

        if (url.protocol !== "https:") {
          throw new Error();
        }
      } catch {
        setMessage(
          "Tautan Maps harus berupa URL HTTPS yang valid.",
        );
        return;
      }
    }

    const next: MarketingSettings = {
      ...form,
      storeName: "SUPER MURAH KUPANG",
      storeAddress: form.storeAddress.trim(),
      storeHours: form.storeHours.trim(),
      storePhone: form.storePhone.trim(),
      storeMapsUrl: form.storeMapsUrl.trim(),
    };

    try {
      localStorage.setItem(
        "smk_marketing_settings",
        JSON.stringify(next),
      );

      onSaveSettings(next);

      setMessage(
        "Informasi toko berhasil disimpan di browser ini.",
      );
    } catch {
      setMessage(
        "Belum tersimpan. Penyimpanan browser penuh atau diblokir.",
      );
    }
  };

  return (
    <section className="content-workspace-section">
      <h3>Informasi toko</h3>

      <p>
        Informasi ini dipakai pada footer dan kontak
        WhatsApp. Artikel dikelola pada bagian
        Artikel website di atas.
      </p>

      <form
        onSubmit={save}
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <label>
          Nama toko
          <input
            value="SUPER MURAH KUPANG"
            readOnly
          />
        </label>

        <label>
          Alamat toko
          <textarea
            required
            value={form.storeAddress}
            onChange={(event) =>
              update(
                "storeAddress",
                event.target.value,
              )
            }
          />
        </label>

        <label>
          Jam operasional
          <input
            required
            value={form.storeHours}
            onChange={(event) =>
              update(
                "storeHours",
                event.target.value,
              )
            }
          />
        </label>

        <label>
          WhatsApp toko
          <input
            required
            type="tel"
            value={form.storePhone}
            onChange={(event) =>
              update(
                "storePhone",
                event.target.value,
              )
            }
            placeholder="08... atau +628..."
          />
        </label>

        <label>
          Tautan Google Maps
          <input
            type="url"
            value={form.storeMapsUrl}
            onChange={(event) =>
              update(
                "storeMapsUrl",
                event.target.value,
              )
            }
            placeholder="https://maps.google.com/..."
          />
        </label>

        <button
          className="primary-btn"
          type="submit"
        >
          <Save size={16} />
          Simpan informasi toko
        </button>

        {message && (
          <p role="status">{message}</p>
        )}
      </form>
    </section>
  );
}