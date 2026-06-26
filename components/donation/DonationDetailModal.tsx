"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { formatRupiah, formatDate } from "@/lib/format";
import { getDonationProof } from "@/services/claim";

type DonationLike = {
    id: number;
    ref_no?: string;
    donor_name?: string | null;
    donor_alias?: string | null;
    salutation?: string | null;
    donor_phone?: string | null;
    donor_email?: string | null;
    amount: number;
    on_behalf?: string | null;
    message?: string | null;
    bank_account?: { bank_name?: string | null } | null;
    source?: string;
    status: string;
    created_at: string;
    has_proof?: boolean;
};

const STATUS: Record<string, string> = { pending: "Pending", claimed: "Diklaim", rejected: "Ditolak" };

function Row({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex justify-between gap-4 border-b border-outline-variant/50 pb-2">
            <span className="text-sm text-on-surface-variant shrink-0">{label}</span>
            <span className="text-sm font-medium text-on-surface text-right break-words">{value}</span>
        </div>
    );
}

export function DonationDetailModal({ open, donation, onClose }: {
    open: boolean; donation: DonationLike | null; onClose: () => void;
}) {
    const [proofUrl, setProofUrl] = useState<string | null>(null);

    useEffect(() => {
        setProofUrl(null);
        if (open && donation?.has_proof) {
            getDonationProof(donation.id).then(setProofUrl).catch(() => { });
        }
    }, [open, donation]);

    if (!donation) return null;
    const wakif = [donation.salutation, donation.donor_name].filter(Boolean).join(" ");

    return (
        <Modal open={open} onClose={onClose} title="Detail Donasi" maxWidth="max-w-2xl">
            <div className="flex flex-col gap-4">
                <Row label="Ref" value={donation.ref_no} />
                <Row label="Wakif" value={wakif} />
                <Row label="Nama Tampil" value={donation.donor_alias} />
                <Row label="No HP" value={donation.donor_phone} />
                <Row label="Email" value={donation.donor_email} />
                <Row label="Nominal" value={formatRupiah(donation.amount)} />
                <Row label="Atas Nama" value={donation.on_behalf} />
                <Row label="Pesan / Doa" value={donation.message} />
                <Row label="Rekening" value={donation.bank_account?.bank_name} />
                <Row label="Status" value={STATUS[donation.status] ?? donation.status} />
                <Row label="Tanggal" value={formatDate(donation.created_at)} />

                <div>
                    <p className="text-sm font-medium text-on-surface mb-2">Bukti Transfer</p>
                    {!donation.has_proof ? (
                        <p className="text-sm text-on-surface-variant">Tidak ada bukti.</p>
                    ) : proofUrl ? (
                        <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={proofUrl} alt="Bukti transfer" className="max-h-96 w-auto rounded-lg border border-outline-variant bg-white object-contain" />
                        </a>
                    ) : (
                        <div className="h-40 flex items-center justify-center bg-surface-container animate-pulse rounded-lg text-on-surface-variant">
                            <Icon name="hourglass_empty" />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}