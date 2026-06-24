"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import type { NewsItem, NewsStatus } from "@/types";
import { RichTextEditor } from "@/components/news/RichTextEditor";
import { saveNews, getNewsCategories, createNewsCategory, type NewsCategory } from "@/services/news";

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function NewsFormModal({ open, item, onClose, onSaved }: {
    open: boolean;
    item: NewsItem | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(item);

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [content, setContent] = useState("");
    const [author, setAuthor] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState<NewsCategory[]>([]);
    const [addingCat, setAddingCat] = useState(false);
    const [newCat, setNewCat] = useState("");
    const [catLoading, setCatLoading] = useState(false);
    const [tagsInput, setTagsInput] = useState("");
    const [metaDesc, setMetaDesc] = useState("");
    const [status, setStatus] = useState<NewsStatus>("draft");
    const [publishedAt, setPublishedAt] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle(item?.title ?? "");
        setSlug(item?.slug ?? "");
        setSlugTouched(false);
        setContent(item?.content ?? "");
        setAuthor(item?.author ?? "");
        setAddingCat(false);
        getNewsCategories().then(setCategories).catch(() => setCategories([]));
        setCategory(item?.category ?? "");
        setTagsInput((item?.tags ?? []).join(", "));
        setMetaDesc(item?.meta_desc ?? "");
        setStatus(item?.status ?? "draft");
        setPublishedAt(item?.published_at ? item.published_at.slice(0, 16) : "");
        setImage(null);
        setPreview(item?.featured_image_url ?? null);
        setErr(null);
    }, [open, item]);

    useEffect(() => {
        if (!slugTouched && !isEdit) setSlug(slugify(title));
    }, [title, slugTouched, isEdit]);

    async function handleAddCategory() {
        const name = newCat.trim();
        if (!name) return;
        setCatLoading(true);
        try {
            const created = await createNewsCategory(name);
            setCategories((prev) =>
                prev.some((c) => c.id === created.id)
                    ? prev
                    : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
            );
            setCategory(created.name);
            setAddingCat(false);
            setNewCat("");
            setErr(null);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Gagal menambah kategori.");
        } finally {
            setCatLoading(false);
        }
    }

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { setErr("Gambar maksimal 10MB."); return; }
        setImage(f);
        setPreview(URL.createObjectURL(f));
        setErr(null);
    }

    async function submit(forceStatus?: NewsStatus) {
        setErr(null);
        if (!title.trim()) { setErr("Judul artikel wajib diisi."); return; }
        const finalStatus = forceStatus ?? status;
        setLoading(true);
        try {
            const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
            await saveNews(
                {
                    title: title.trim(),
                    slug: slug || undefined,
                    content,
                    author: author.trim() || undefined,
                    category: category.trim() || undefined,
                    tags,
                    meta_desc: metaDesc.trim() || undefined,
                    status: finalStatus,
                    published_at: publishedAt || undefined,
                    featured_image: image,
                },
                item?.id
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan artikel.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Artikel" : "Tulis Artikel Baru"} maxWidth="max-w-4xl">
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Kiri: editor utama */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Judul Artikel <span className="text-error">*</span></span>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masukkan judul yang menarik"
                                className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">URL Slug</span>
                            <div className="flex rounded-lg overflow-hidden border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                                <span className="bg-surface-container px-3 py-2.5 border-r border-outline-variant text-on-surface-variant font-mono text-xs flex items-center whitespace-nowrap">/berita/</span>
                                <input type="text" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} placeholder="judul-artikel"
                                    className="w-full bg-surface px-3 py-2.5 text-sm font-mono text-on-surface outline-none" />
                            </div>
                        </label>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Konten</span>
                            <RichTextEditor value={content} onChange={setContent} />
                            <span className="text-xs text-on-surface-variant">Gunakan toolbar untuk format teks (heading, tebal, list, link).</span>
                        </div>
                    </div>

                    {/* Kanan: metadata */}
                    <div className="flex flex-col gap-4">
                        {/* Publikasi */}
                        <div className="rounded-lg border border-outline-variant p-4 flex flex-col gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Publikasi</p>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm text-on-surface">Status</span>
                                <select value={status} onChange={(e) => setStatus(e.target.value as NewsStatus)}
                                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none">
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm text-on-surface">Tanggal Publish</span>
                                <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)}
                                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                                <span className="text-xs text-on-surface-variant">Kosongkan → otomatis saat dipublish.</span>
                            </label>
                        </div>

                        {/* Gambar utama */}
                        <div className="rounded-lg border border-outline-variant p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Gambar Utama</p>
                            <div className="aspect-video rounded-lg border border-outline-variant bg-surface overflow-hidden mb-2 flex items-center justify-center">
                                {preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={preview} alt="featured" className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name="image" className="text-[32px] text-outline-variant" />
                                )}
                            </div>
                            <label className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                                <Icon name="upload" className="text-[18px]" /> {preview ? "Ganti Gambar" : "Unggah Gambar"}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="hidden" />
                            </label>
                        </div>

                        {/* Metadata */}
                        <div className="rounded-lg border border-outline-variant p-4 flex flex-col gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Metadata</p>
                            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Nama penulis"
                                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                            <div className="flex flex-col gap-1.5">
                                {!addingCat ? (
                                    <div className="flex gap-2">
                                        <select value={category} onChange={(e) => setCategory(e.target.value)}
                                            className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none">
                                            <option value="">— Pilih kategori —</option>
                                            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            {category && !categories.some((c) => c.name === category) && (
                                                <option value={category}>{category}</option>
                                            )}
                                        </select>
                                        <button type="button" onClick={() => { setAddingCat(true); setNewCat(""); }} title="Tambah kategori baru"
                                            className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-3 text-on-surface hover:bg-surface-container transition-colors">
                                            <Icon name="add" className="text-[18px]" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nama kategori baru" autoFocus
                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                                            className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                                        <button type="button" onClick={handleAddCategory} disabled={catLoading || !newCat.trim()}
                                            className="inline-flex items-center justify-center rounded-lg bg-primary px-3 text-on-primary hover:bg-primary-container disabled:opacity-50 transition-colors">
                                            {catLoading ? <Icon name="progress_activity" className="text-[18px] animate-spin" /> : <Icon name="check" className="text-[18px]" />}
                                        </button>
                                        <button type="button" onClick={() => setAddingCat(false)}
                                            className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-3 text-on-surface hover:bg-surface-container transition-colors">
                                            <Icon name="close" className="text-[18px]" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tag, pisahkan dengan koma"
                                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                            <div>
                                <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value.slice(0, 160))} rows={3} placeholder="Ringkasan singkat untuk SEO..."
                                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none resize-none" />
                                <p className="text-[11px] text-on-surface-variant text-right mt-0.5">{metaDesc.length} / 160</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aksi */}
                <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant mt-1">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="button" onClick={() => submit("draft")} disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-60 transition-colors">
                        <Icon name="save" className="text-[18px]" /> Simpan Draft
                    </button>
                    <button type="button" onClick={() => submit("published")} disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading ? <Icon name="progress_activity" className="text-[18px] animate-spin" /> : <Icon name="publish" className="text-[18px]" />}
                        {loading ? "Menyimpan..." : "Publikasikan"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}