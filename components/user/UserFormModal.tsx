"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { createUser, updateUser } from "@/services/user";
import type { StaffUser, StaffRole } from "@/types";

const ROLES: { value: StaffRole; label: string; desc: string }[] = [
    { value: "super_admin", label: "Super Admin", desc: "Akses penuh termasuk manajemen user." },
    { value: "admin", label: "Admin", desc: "Akses penuh kecuali manajemen user." },
    { value: "cs", label: "CS", desc: "Input & klaim donasi, CRM (tanpa ubah status)." },
    { value: "fundraiser", label: "Fundraiser", desc: "Peran penggalangan dana." },
];

export function UserFormModal({ open, user, onClose, onSaved, onAuthFail }: {
    open: boolean;
    user: StaffUser | null;
    onClose: () => void;
    onSaved: () => void;
    onAuthFail: () => void;
}) {
    const isEdit = Boolean(user);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<StaffRole>("cs");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [showPwd, setShowPwd] = useState(false);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setName(user?.name ?? "");
        setEmail(user?.email ?? "");
        setPhone(user?.phone ?? "");
        setRole(user?.role ?? "cs");
        setIsActive(user?.is_active ?? true);
        setPassword("");
        setPasswordConfirm("");
        setShowPwd(false);
        setErr(null);
    }, [open, user]);

    function validate(): string | null {
        if (!name.trim()) return "Nama wajib diisi.";
        if (!email.trim()) return "Email wajib diisi.";
        if (!/^\S+@\S+\.\S+$/.test(email)) return "Format email tidak valid.";
        if (!phone.trim()) return "Nomor HP wajib diisi.";
        if (!isEdit) {
            if (password.length < 8) return "Password minimal 8 karakter.";
            if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Password harus mengandung huruf dan angka.";
            if (password !== passwordConfirm) return "Konfirmasi password tidak cocok.";
        }
        return null;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const v = validate();
        if (v) { setErr(v); return; }
        setErr(null);
        setLoading(true);
        try {
            if (isEdit && user) {
                await updateUser(user.id, {
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    role,
                    is_active: isActive,
                });
            } else {
                await createUser({
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    role,
                    password,
                    password_confirmation: passwordConfirm,
                    is_active: isActive,
                });
            }
            onSaved();
        } catch (e2) {
            const code = e2 instanceof Error ? e2.message : "SERVER";
            if (code === "UNAUTHORIZED") { onAuthFail(); return; }
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan staf.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Staf" : "Tambah Staf"} maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Nama Lengkap <span className="text-error">*</span></span>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Ahmad Fauzi"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">No. HP <span className="text-error">*</span></span>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Email <span className="text-error">*</span></span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@bwkr.id"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                {/* Role */}
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Role <span className="text-error">*</span></span>
                    <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <span className="text-xs text-on-surface-variant">{ROLES.find((r) => r.value === role)?.desc}</span>
                </label>

                {/* Password — hanya saat tambah */}
                {!isEdit && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Password <span className="text-error">*</span></span>
                            <div className="relative">
                                <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8, huruf & angka"
                                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 pr-10 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-primary transition-colors">
                                    <Icon name={showPwd ? "visibility_off" : "visibility"} className="text-[18px]" />
                                </button>
                            </div>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Konfirmasi Password <span className="text-error">*</span></span>
                            <input type={showPwd ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Ulangi password"
                                className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        </label>
                    </div>
                )}

                {isEdit && (
                    <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-2.5 text-xs text-on-surface-variant">
                        <Icon name="info" className="text-[16px] text-primary" />
                        Untuk mengganti kata sandi, gunakan tombol <span className="font-semibold">Reset Password</span> di daftar staf.
                    </div>
                )}

                {/* Status aktif */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                    <div>
                        <span className="text-sm text-on-surface">Akun aktif</span>
                        <p className="text-xs text-on-surface-variant">Akun nonaktif tidak bisa login.</p>
                    </div>
                </label>

                <div className="flex justify-end gap-3 pt-1">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Staf"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}