export function Icon({ name, filled = false, className = "" }: {
    name: string; filled?: boolean; className?: string; title?: string;
}) {
    return (
        <span
            className={`material-symbols-outlined select-none ${className}`}
            style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
        >
            {name}
        </span>
    );
}