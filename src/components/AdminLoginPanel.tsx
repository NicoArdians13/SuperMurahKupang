import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, X } from "lucide-react";

type Props = {
  login: { email: string; password: string };
  loading: boolean;
  checking: boolean;
  error: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
};
export function AdminLoginPanel({ login, loading, checking, error, onChange, onSubmit, onClose }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    form.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
    return () => previous?.focus({ preventScroll: true });
  }, []);
  return <form ref={form} onSubmit={onSubmit} className="admin-signin" role="dialog" aria-modal="true" aria-labelledby="admin-signin-title" aria-describedby="admin-signin-description" aria-busy={loading} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const controls = Array.from(form.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <button className="signin-close" type="button" onClick={onClose} aria-label="Tutup login admin"><X size={20} /></button>
    <div className="signin-brand"><img src="/logo-nota.png" alt="SUPER MURAH KUPANG" /><span>PORTAL ADMIN</span></div>
    <div className="signin-heading"><span className="signin-mark"><ShieldCheck size={25} /></span><h2 id="admin-signin-title">Selamat datang kembali</h2><p id="admin-signin-description">Masuk untuk mengelola katalog, pesanan, dan konten toko.</p></div>
    <div className="signin-fields">
      <label htmlFor="admin-email">Email admin</label>
      <div className="signin-input"><Mail size={18} /><input id="admin-email" name="email" type="email" value={login.email} onChange={onChange} placeholder="Masukkan email admin" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={loading} aria-invalid={Boolean(error)} aria-describedby={error ? "admin-signin-error" : undefined} /></div>
      <label htmlFor="admin-password">Password</label>
      <div className="signin-input"><LockKeyhole size={18} /><input id="admin-password" name="password" type={showPassword ? "text" : "password"} value={login.password} onChange={onChange} placeholder="Masukkan password" autoComplete="current-password" required disabled={loading} aria-invalid={Boolean(error)} aria-describedby={error ? "admin-signin-error" : undefined} /><button className="signin-eye" type="button" aria-controls="admin-password" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
    </div>
    {error && <p className="signin-error" id="admin-signin-error" role="alert">{error}</p>}
    <button type="submit" className="signin-submit" disabled={loading || checking}>{loading || checking ? <><LoaderCircle size={18} className="signin-spinner" />{loading ? "Sedang masuk..." : "Memeriksa sesi..."}</> : <>Masuk ke dashboard <ArrowRight size={18} /></>}</button>
    <p className="signin-footnote"><ShieldCheck size={14} /> Akses khusus pengelola Super Murah Kupang</p>
  </form>;
}
