export function ProgramListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                    <div className="h-44 bg-surface-container" />
                    <div className="p-5">
                        <div className="h-4 w-3/4 bg-surface-container rounded mb-3" />
                        <div className="h-3 w-full bg-surface-container rounded mb-2" />
                        <div className="h-3 w-2/3 bg-surface-container rounded mb-5" />
                        <div className="h-3 w-1/3 bg-surface-container rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}