"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffUser, StaffRole } from "@/types";
import { getUsers, deleteUser, resetUserPassword, resetUserTwoFactor } from "@/services/user";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UserFormModal } from "@/components/user/UserFormModal";

type ViewState = "loading" | "ready" | "error";

const ROLE_BADGE: Record<StaffRole, { label: string; cls: string }> = {
    super_admin: { label: "Super Admin", cls: "bg-primary/10 text-primary" },
    admin: { label: "Admin", cls: "bg-secondary-container text-on-secondary-container" },
    cs: { label: "CS", cls: "bg-tertiary-container/15 text-tertiary" },
    fundraiser: { label: "Fundraiser", cls: "bg-surface-variant text-on-surface-variant" },
};

function initials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export default function UsersPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);
    const me = useAdminAuth((s) => s.user);

    const [state, setState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<StaffUser[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [errMsg, setErrMsg] = useState("");

    const [tab, setTab] = useState<"staf" | "donatur">("staf");
    const [search, setSearch] = useState("");
    const [role, setRole] = useState<StaffRole | "">("");
    const [page, setPage] = useState(1);

    // dialog states
    const [confirm, setConfirm] = useState<{ user: StaffUser; action: "delete" | "reset-2fa" } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [pwdConfirm, setPwdConfirm] = useState<StaffUser | null>(null);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [tempPwd, setTempPwd] = useState<{ user: string; pwd: string } | null>(null);
    const [busyId] = useState<number | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<StaffUser | null>(null);

    async function load() {
        setState("loading");
        try {
            const effectiveRole = tab === "donatur" ? "donatur" : role;
            const res = await getUsers({ search, role: effectiveRole, page });
            setRows(res.data);
            setMeta({ current_page: res.meta.current_page, last_page: res.meta.last_page, total: res.meta.total });
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, [page, role, tab]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); load(); }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    async function runConfirm() {
        if (!confirm) return;
        setConfirmLoading(true);
        try {
            if (confirm.action === "delete") await deleteUser(confirm.user.id);
            else await resetUserTwoFactor(confirm.user.id);
            setConfirm(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(err instanceof Error && !["NETWORK", "SERVER", "VALIDATION", "UNAUTHORIZED"].includes(err.message) ? err.message : friendlyError(code));
        } finally {
            setConfirmLoading(false);
        }
    }

    async function runResetPassword() {
        if (!pwdConfirm) return;
        setPwdLoading(true);
        try {
            const pwd = await resetUserPassword(pwdConfirm.id);
            setTempPwd({ user: pwdConfirm.name, pwd });
            setPwdConfirm(null);
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setPwdLoading(false);
        }
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Manajemen User</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola akun staf & lihat daftar donatur terdaftar.</p>
                </div>
                {tab === "staf" && (
                    <button
                        onClick={() => { setEditing(null); setFormOpen(true); }}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                        <Icon name="person_add" className="text-[18px]" /> Tambah Staf
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-outline-variant">
                {([["staf", "Staf"], ["donatur", "Donatur"]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => { setTab(key); setPage(1); }}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === key ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-primary"}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Filter */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative w-full sm:max-w-md">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau email..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </div>
                {tab === "staf" && (
                    <select value={role} onChange={(e) => { setRole(e.target.value as StaffRole | ""); setPage(1); }}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                        <option value="">Semua Role</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="cs">CS</option>
                        <option value="fundraiser">Fundraiser</option>
                    </select>
                )}
            </div>

            {state === "loading" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-surface-container rounded mb-2" />)}
                </div>
            ) : state === "error" ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border border-outline-variant rounded-xl bg-surface-container-lowest">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="group" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">{tab === "donatur" ? "Belum Ada Donatur" : "Belum Ada Staf"}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{search || role ? "Tidak ada yang cocok dengan filter." : (tab === "donatur" ? "Belum ada donatur terdaftar." : "Tambahkan akun staf pertama.")}</p>
                </div>
            ) : tab === "donatur" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[640px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Donatur</th>
                                    <th className="px-5 py-3 font-semibold">Kontak</th>
                                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {rows.map((u) => (
                                    <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-bold shrink-0">{initials(u.name)}</div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-on-surface line-clamp-1">{u.name}</p>
                                                    <p className="text-xs text-on-surface-variant">Bergabung {formatDate(u.created_at)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-on-surface">{u.email}</p>
                                            <p className="text-xs text-on-surface-variant font-mono">{u.phone}</p>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-primary" : "bg-error"}`} />
                                                {u.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-center gap-3 py-4 border-t border-outline-variant">
                            <button disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors"><Icon name="chevron_left" className="text-[18px]" /> Sebelumnya</button>
                            <span className="text-sm text-on-surface-variant">Hal {meta.current_page} / {meta.last_page}</span>
                            <button disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors">Berikutnya <Icon name="chevron_right" className="text-[18px]" /></button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[820px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Staf</th>
                                    <th className="px-5 py-3 font-semibold">Kontak</th>
                                    <th className="px-5 py-3 font-semibold text-center">Role</th>
                                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                                    <th className="px-5 py-3 font-semibold text-center">2FA</th>
                                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {rows.map((u) => {
                                    const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.fundraiser;
                                    const isSelf = me?.id === u.id;
                                    return (
                                        <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">{initials(u.name)}</div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-on-surface line-clamp-1">{u.name}{isSelf && <span className="ml-1.5 text-xs text-on-surface-variant">(Anda)</span>}</p>
                                                        <p className="text-xs text-on-surface-variant">Bergabung {formatDate(u.created_at)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-on-surface">{u.email}</p>
                                                <p className="text-xs text-on-surface-variant font-mono">{u.phone}</p>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${badge.cls}`}>{badge.label}</span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-primary" : "bg-error"}`} />
                                                    {u.is_active ? "Aktif" : "Nonaktif"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {u.two_factor_enabled ? (
                                                    <Icon name="verified_user" className="text-[20px] text-primary" title="2FA aktif" />
                                                ) : (
                                                    <Icon name="gpp_maybe" className="text-[20px] text-on-surface-variant" title="2FA belum aktif" />
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => { setEditing(u); setFormOpen(true); }}
                                                        className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Edit"><Icon name="edit" className="text-[18px]" /></button>
                                                    <button onClick={() => setPwdConfirm(u)} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors" title="Reset Password"><Icon name="lock_reset" className="text-[18px]" /></button>
                                                    <button onClick={() => setConfirm({ user: u, action: "reset-2fa" })} disabled={busyId === u.id} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors" title="Reset 2FA"><Icon name="shield_lock" className="text-[18px]" /></button>
                                                    {!isSelf && (
                                                        <button onClick={() => setConfirm({ user: u, action: "delete" })} className="p-2 rounded-lg text-error hover:bg-error-container/30 transition-colors" title="Hapus"><Icon name="delete" className="text-[18px]" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-center gap-3 py-4 border-t border-outline-variant">
                            <button disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors">
                                <Icon name="chevron_left" className="text-[18px]" /> Sebelumnya
                            </button>
                            <span className="text-sm text-on-surface-variant">Hal {meta.current_page} / {meta.last_page}</span>
                            <button disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors">
                                Berikutnya <Icon name="chevron_right" className="text-[18px]" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <UserFormModal
                open={formOpen}
                user={editing}
                onClose={() => setFormOpen(false)}
                onSaved={() => { setFormOpen(false); load(); }}
                onAuthFail={async () => { await logout(); router.replace("/login"); }}
            />

            <ConfirmDialog
                open={!!confirm}
                title={confirm?.action === "delete" ? "Hapus Staf" : "Reset 2FA"}
                message={
                    confirm?.action === "delete"
                        ? `Hapus akun "${confirm?.user.name}"? Semua sesi login-nya akan dicabut.`
                        : `Reset 2FA untuk "${confirm?.user.name}"? Mereka wajib setup ulang authenticator saat login berikutnya.`
                }
                confirmLabel={confirm?.action === "delete" ? "Hapus" : "Reset 2FA"}
                danger={confirm?.action === "delete"}
                loading={confirmLoading}
                onConfirm={runConfirm}
                onClose={() => setConfirm(null)}
            />

            <ConfirmDialog
                open={!!pwdConfirm}
                title="Reset Kata Sandi"
                message={`Reset kata sandi "${pwdConfirm?.name}"? Password sementara akan dibuat dan sesi login-nya dicabut.`}
                confirmLabel="Reset Password"
                loading={pwdLoading}
                onConfirm={runResetPassword}
                onClose={() => setPwdConfirm(null)}
            />

            {tempPwd && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setTempPwd(null)}>
                    <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Icon name="lock_reset" className="text-[22px]" /></div>
                            <h3 className="text-lg font-semibold text-on-surface">Password Sementara</h3>
                        </div>
                        <p className="text-sm text-on-surface-variant mb-3">Salin & berikan password ini ke <span className="font-semibold text-on-surface">{tempPwd.user}</span>. Password hanya ditampilkan sekali.</p>
                        <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface p-3 mb-4">
                            <code className="flex-1 font-mono text-sm text-on-surface break-all">{tempPwd.pwd}</code>
                            <button onClick={() => navigator.clipboard?.writeText(tempPwd.pwd)} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Salin"><Icon name="content_copy" className="text-[18px]" /></button>
                        </div>
                        <button onClick={() => setTempPwd(null)} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">Selesai</button>
                    </div>
                </div>
            )}
        </div>
    );
}