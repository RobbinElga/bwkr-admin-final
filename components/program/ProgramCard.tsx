import { Icon } from "@/components/ui/Icon";
import type { Program } from "@/types";

const STATUS: Record<Program["status"], { label: string; cls: string }> = {
    aktif: { label: "Aktif", cls: "bg-primary/10 text-primary border border-primary/20" },
    nonaktif: { label: "Nonaktif", cls: "bg-surface-container-high text-on-surface-variant border border-outline-variant" },
};

export function ProgramCard({ program, onOpen, onEdit, onDelete }: {
    program: Program;
    onOpen: () => void;
    onEdit: () => void;
    onDelete?: () => void;
}) {
    const s = STATUS[program.status] ?? STATUS.nonaktif;

    return (
        <div
            role="button" tabIndex={0} onClick={onOpen}
            onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
            className="cursor-pointer bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow group flex flex-col"
        >
            <div className="h-44 bg-surface-container-high relative overflow-hidden">
                {program.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={program.image_url} alt={program.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline-variant">
                        <Icon name="image" className="text-[40px]" />
                    </div>
                )}

                {/* Aksi edit & hapus */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-1.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface-variant hover:text-primary shadow-sm transition-colors">
                        <Icon name="edit" className="text-[18px]" />
                    </button>
                    {onDelete && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface-variant hover:text-error shadow-sm transition-colors">
                            <Icon name="delete" className="text-[18px]" />
                        </button>
                    )}
                </div>

                <span className={`absolute top-3 right-3 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide backdrop-blur-sm ${s.cls}`}>
                    {s.label}
                </span>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-semibold text-on-surface mb-1.5 group-hover:text-primary transition-colors">{program.name}</h3>
                <p className="text-sm text-on-surface-variant line-clamp-2">{program.description || "Belum ada deskripsi."}</p>
                <div className="mt-auto pt-4 border-t border-outline-variant/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-secondary font-medium">
                        <Icon name="folder_open" className="text-[18px]" /> Kelola Project
                    </span>
                    <Icon name="arrow_forward" className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </div>
            </div>
        </div>
    );
}