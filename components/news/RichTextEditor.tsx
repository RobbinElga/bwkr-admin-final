"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Props = {
    value: string;
    onChange: (html: string) => void;
};

const TOOLS: { cmd: string; arg?: string; icon: string; title: string }[] = [
    { cmd: "bold", icon: "format_bold", title: "Tebal" },
    { cmd: "italic", icon: "format_italic", title: "Miring" },
    { cmd: "underline", icon: "format_underlined", title: "Garis bawah" },
    { cmd: "formatBlock", arg: "H2", icon: "title", title: "Heading" },
    { cmd: "formatBlock", arg: "H3", icon: "text_fields", title: "Subheading" },
    { cmd: "insertUnorderedList", icon: "format_list_bulleted", title: "List" },
    { cmd: "insertOrderedList", icon: "format_list_numbered", title: "List angka" },
    { cmd: "formatBlock", arg: "BLOCKQUOTE", icon: "format_quote", title: "Kutipan" },
];

export function RichTextEditor({ value, onChange }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<Record<string, boolean>>({});

    // Set isi awal sekali (hindari kursor lompat saat re-render)
    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== value) {
            ref.current.innerHTML = value || "";
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function sync() {
        if (ref.current) onChange(ref.current.innerHTML);
    }

    function refreshActive() {
        if (typeof document === "undefined") return;
        setActive({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            insertUnorderedList: document.queryCommandState("insertUnorderedList"),
            insertOrderedList: document.queryCommandState("insertOrderedList"),
        });
    }

    function exec(cmd: string, arg?: string) {
        ref.current?.focus();
        // toggle heading: kalau sudah heading sama, kembalikan ke paragraph
        if (cmd === "formatBlock" && arg) {
            document.execCommand("formatBlock", false, arg);
        } else {
            document.execCommand(cmd, false, arg);
        }
        sync();
        refreshActive();
    }

    function addLink() {
        const url = window.prompt("Masukkan URL (termasuk https://):", "https://");
        if (!url) return;
        ref.current?.focus();
        document.execCommand("createLink", false, url);
        sync();
    }

    return (
        <div className="rounded-lg border border-outline-variant overflow-hidden bg-surface-container-lowest">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant bg-surface-container-low p-2">
                {TOOLS.map((t) => (
                    <button key={t.icon} type="button" title={t.title} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(t.cmd, t.arg)}
                        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${active[t.cmd] ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                            }`}>
                        <Icon name={t.icon} className="text-[18px]" />
                    </button>
                ))}
                <div className="w-px h-6 bg-outline-variant mx-1" />
                <button type="button" title="Sisip link" onMouseDown={(e) => e.preventDefault()} onClick={addLink}
                    className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
                    <Icon name="link" className="text-[18px]" />
                </button>
                <button type="button" title="Hapus format" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")}
                    className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
                    <Icon name="format_clear" className="text-[18px]" />
                </button>
            </div>

            {/* Area editor */}
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                onInput={sync}
                onKeyUp={refreshActive}
                onMouseUp={refreshActive}
                data-placeholder="Tulis isi berita di sini..."
                className="article-content min-h-[320px] max-h-[50vh] overflow-y-auto px-4 py-3 text-sm text-on-surface outline-none focus:ring-0
                   [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-outline [&:empty:before]:pointer-events-none"
            />
        </div>
    );
} 