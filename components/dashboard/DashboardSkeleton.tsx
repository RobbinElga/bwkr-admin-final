export function DashboardSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="h-7 w-56 bg-surface-container rounded mb-2" />
            <div className="h-4 w-72 bg-surface-container rounded mb-6" />

            {/* 4 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                        <div className="w-10 h-10 rounded-lg bg-surface-container mb-4" />
                        <div className="h-3 w-24 bg-surface-container rounded mb-2" />
                        <div className="h-6 w-32 bg-surface-container rounded" />
                    </div>
                ))}
            </div>

            {/* 2 kolom */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                    <div className="h-5 w-44 bg-surface-container rounded mb-4" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-20 bg-surface-container rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                    <div className="h-5 w-32 bg-surface-container rounded mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-12 bg-surface-container rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
            {/* chart */}
            <div className="mt-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="h-5 w-32 bg-surface-container rounded mb-5" />
                <div className="h-48 bg-surface-container rounded-lg" />
            </div>

            {/* tabel */}
            <div className="mt-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="h-5 w-40 bg-surface-container rounded mb-4" />
                <div className="space-y-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-9 bg-surface-container rounded" />
                    ))}
                </div>
            </div>
        </div>
    );
}