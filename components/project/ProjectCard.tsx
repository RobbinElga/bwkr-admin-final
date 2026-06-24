import { Icon } from "@/components/ui/Icon";
import { formatRupiah } from "@/lib/format";
import type { Project } from "@/types";

const STATUS: Record<Project["status"], { label: string; cls: string }> = {
    berjalan: { label: "Berjalan", cls: "bg-primary-fixed text-on-primary-fixed-variant" },
    selesai: { label: "Selesai", cls: "bg-secondary-container text-on-secondary-container" },
    draft: { label: "Draft", cls: "bg-tertiary-fixed-dim/30 text-tertiary" },
};

function sisaHari(end: string | null): string | null {
    if (!end) return null;
    const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    if (diff < 0) return "Telah berakhir";
    if (diff === 0) return "Berakhir hari ini";
    return `Sisa ${diff} hari`;
}

export function ProjectCard({ project, onOpen, onEdit, onDelete }: {
    project: Project;
    onOpen: () => void;
    onEdit: () => void;
    onDelete?: () => void;
}) {
    const s = STATUS[project.status] ?? STATUS.draft;
    const pct = Math.min(project.progress_percent, 100);
    const sisa = sisaHari(project.end_date);

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow flex flex-col">
            <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide mb-2 ${s.cls}`}>
                            {s.label}
                        </span>
                        <h4 className="text-base font-semibold text-on-surface">{project.name}</h4>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <button onClick={onEdit} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                            <Icon name="edit" className="text-[18px]" />
                        </button>
                        {onDelete && (
                            <button onClick={onDelete} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors">
                                <Icon name="delete" className="text-[18px]" />
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
                    {project.description || "Belum ada deskripsi."}
                </p>

                {/* Progress */}
                <div className="bg-surface-container-low rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-on-surface-variant">Progress Pengumpulan</span>
                        <span className="font-bold text-primary">{pct}%</span>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden mb-3">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                        <div>
                            <span className="block text-on-surface-variant">Terkumpul</span>
                            <span className="text-on-surface">{formatRupiah(project.amount_raised)}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-on-surface-variant">Target</span>
                            <span className="text-on-surface">{formatRupiah(project.target_amount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-outline-variant px-5 py-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    {sisa && <><Icon name="schedule" className="text-[16px]" /> {sisa}</>}
                </span>
                <button onClick={onOpen} className="text-sm font-semibold text-primary hover:underline">
                    Detail Project →
                </button>
            </div>
        </div>
    );
}