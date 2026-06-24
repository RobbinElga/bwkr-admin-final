import { formatRupiah, formatDate } from "@/lib/format";
import type { RecentDonation } from "@/types";

const STATUS: Record<RecentDonation["status"], { label: string; cls: string }> = {
    claimed: { label: "Berhasil", cls: "bg-primary/10 text-primary" },
    pending: { label: "Menunggu", cls: "bg-tertiary-container/10 text-tertiary-container" },
    rejected: { label: "Gagal", cls: "bg-error/10 text-error" },
};

export function RecentDonations({ data }: { data: RecentDonation[] }) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant">
                <h3 className="text-base font-semibold text-on-surface">Transaksi Terbaru</h3>
            </div>

            {data.length === 0 ? (
                <div className="py-12 text-center text-sm text-on-surface-variant">Belum ada transaksi.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                <th className="px-5 py-3 font-semibold">Ref</th>
                                <th className="px-5 py-3 font-semibold">Wakif</th>
                                <th className="px-5 py-3 font-semibold">Tujuan</th>
                                <th className="px-5 py-3 font-semibold text-right">Jumlah</th>
                                <th className="px-5 py-3 font-semibold text-center">Status</th>
                                <th className="px-5 py-3 font-semibold text-right">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/60">
                            {data.map((d) => {
                                const s = STATUS[d.status] ?? STATUS.pending;
                                return (
                                    <tr key={d.ref_no} className="hover:bg-surface-container-low transition-colors">
                                        <td className="px-5 py-3 font-mono text-primary">{d.ref_no}</td>
                                        <td className="px-5 py-3 font-medium text-on-surface">{d.donor_name}</td>
                                        <td className="px-5 py-3 text-on-surface-variant">{d.target ?? "—"}</td>
                                        <td className="px-5 py-3 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(d.amount)}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                                                {s.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-on-surface-variant whitespace-nowrap">
                                            {formatDate(d.created_at)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}