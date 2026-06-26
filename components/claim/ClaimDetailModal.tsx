"use client";

import { Modal } from "@/components/ui/Modal";
import { formatRupiah, formatDate } from "@/lib/format";

type ClaimLike = {
    id: number;
    donation?: { donor_name?: string | null; ref_no?: string | null } | null;
    project?: { name?: string | null } | null;
    project_id?: number;
    amount: number;
    status: string;
    notes?: string | null;
    created_at: string;
    approved_at?: string | null;
};

const STATUS: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };

function Row({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex justify-between gap-4 border-b border-outline-variant/50 pb-2">
            <span className="text-sm text-on-surface-variant shrink-0">{label}</span>
            <span className="text-sm font-medium text-on-surface text-right break-words">{value}</span>
        </div>
    );
}

export function ClaimDetailModal({ open, claim, onClose }: {
    open: boolean; claim: ClaimLike | null; onClose: () => void;
}) {
    if (!claim) return null;
    return (
        <Modal open={open} onClose={onClose} title="Detail Klaim" maxWidth="max-w-lg">
            <div className="flex flex-col gap-4">
                <Row label="Wakif" value={claim.donation?.donor_name} />
                <Row label="Ref Donasi" value={claim.donation?.ref_no} />
                <Row label="Project" value={claim.project?.name ?? (claim.project_id ? `Project #${claim.project_id}` : undefined)} />
                <Row label="Nominal" value={formatRupiah(claim.amount)} />
                <Row label="Status" value={STATUS[claim.status] ?? claim.status} />
                <Row label="Catatan" value={claim.notes} />
                <Row label="Dibuat" value={formatDate(claim.created_at)} />
                <Row label="Disetujui" value={claim.approved_at ? formatDate(claim.approved_at) : undefined} />
            </div>
        </Modal>
    );
}