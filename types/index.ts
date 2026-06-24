export type StaffRole = "super_admin" | "admin" | "cs" | "fundraiser";

export interface StaffUser {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: StaffRole;
    is_active: boolean;
    two_factor_enabled: boolean;
    created_at: string;
}

export interface AuditLog {
    id: number;
    user_id: number | null;
    user_name: string | null;
    action: string;
    model_type: string | null;
    model_id: number | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
}

export interface BankBalance {
    id: number;
    bank_name: string;
    balance: number;
}

export interface DashboardStats {
    programs: { active: number };
    projects: { total: number; running: number; completed: number };
    funds: { total_raised: number; total_disbursed: number; remaining: number };
    donors: { total: number };
    staff_active: number;
    balance_per_account: BankBalance[];
}

export interface DonationTrendPoint {
    month: string; // "2026-05"
    total: number;
}

export interface RecentDonation {
    ref_no: string;
    donor_name: string;
    target: string | null;
    amount: number;
    status: "pending" | "claimed" | "rejected";
    source: "online" | "manual" | "gateway";
    created_at: string;
}

export type ProgramStatus = "aktif" | "nonaktif";

export interface Program {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    status: ProgramStatus;
    order: number;
    created_at: string;
    deleted_at?: string | null;

}

// Bentuk response paginate Laravel
export interface Paginated<T> {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    links: { first: string; last: string; prev: string | null; next: string | null };
}

export type ProjectStatus = "berjalan" | "selesai" | "draft";

export interface Project {
    id: number;
    program_id: number;
    program?: Program;
    name: string;
    slug: string;
    description: string | null;
    image_urls: string[];
    start_date: string | null;
    end_date: string | null;
    target_amount: number;
    amount_raised: number;
    amount_spent: number;
    progress_percent: number;
    shortfall: number;
    remaining_funds: number;
    status: ProjectStatus;
    created_at: string;
    bank_accounts?: BankAccount[];
    deleted_at?: string | null;

}

export interface ProjectStats {
    average_donation: number;
    donor_count: number;
    daily_growth_percent: number;
}

export interface ProjectUpdate {
    id: number;
    project_id: number;
    title: string;
    content: string;
    image_urls: string[];
    published_at: string | null;
    order: number;
}

export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface BankAccountBrief {
    id: number;
    bank_name: string;
    account_name?: string | null;
    account_number?: string | null;
}

export interface Expense {
    id: number;
    project_id: number;
    project?: Project;
    amount: number;
    needs_materai: boolean;
    has_receipt: boolean;
    has_ttd: boolean;
    has_materai: boolean;
    bank_account: BankAccountBrief | null;
    status: ExpenseStatus;
    notes: string | null;
    approved_at: string | null;
    created_at: string;
}

export interface ProjectDonor {
    id: number;
    donor_name: string | null;
    ref_no: string | null;
    amount: number;
    approved_at: string | null;
}

export type DonationSource = "online" | "manual" | "gateway";
export type DonationStatus = "pending" | "claimed" | "rejected";
export type BankAccountType = "bank" | "qris";

export interface BankAccount {
    id: number;
    type: BankAccountType;
    bank_name: string;
    account_number: string | null;
    account_name: string | null;
    logo_url: string | null;
    qris_image_url: string | null;
    initial_balance: number;
    is_active: boolean;
    created_at?: string;
}

export interface DonationInput {
    id: number;
    ref_no: string;
    donor_name: string;
    donor_alias: string | null;
    program_id: number | null;
    project_id: number | null;
    donor_phone: string;
    donor_email: string | null;
    amount: number;
    on_behalf: string | null;
    message: string | null;
    has_proof: boolean;
    bank_account: BankAccount | null;
    source: DonationSource;
    status: DonationStatus;
    user_id: number | null;
    created_at: string;
}

export type ClaimStatus = "pending" | "approved" | "rejected";

export interface Claim {
    id: number;
    donation_input_id: number;
    project_id: number;
    project?: Project;
    donation?: DonationInput;
    amount: number;
    notes: string | null;
    status: ClaimStatus;
    approved_at: string | null;
    created_at: string;
}

export interface Achievement {
    id: number;
    image_url: string | null;
    count: number;
    label: string;
    period: string | null;
    order: number;
}

export interface Partner {
    id: number;
    name: string;
    type: string | null;
    pic_name: string | null;
    pic_phone: string | null;
    pic_email: string | null;
    logo_url: string | null;
    is_visible: boolean;
    created_at?: string;
}

export interface Testimonial {
    id: number;
    name: string;
    title: string | null;
    photo_url: string | null;
    content: string;
    is_visible: boolean;
    order: number;
    created_at?: string;
}

export interface ImpactVideo {
    id: number;
    youtube_url: string;
    youtube_id: string | null;
    caption: string | null;
    program_id: number | null;
    project_id: number | null;
    order: number;
}

export type NewsStatus = "draft" | "published";

export interface NewsItem {
    id: number;
    title: string;
    slug: string;
    content: string | null;
    featured_image_url: string | null;
    author: string | null;
    category: string | null;
    tags: string[];
    meta_desc: string | null;
    status: NewsStatus;
    published_at: string | null;
    created_at: string;
}

export type DonorTier = "reguler" | "premium";

export interface CrmDonor {
    donor_phone_hash: string;
    name: string | null;
    phone: string | null;
    total_donated: number;
    donation_count: number;
    last_donated_at: string | null;
    tier: DonorTier;
}

export interface CrmDonorDetail {
    donor: {
        donor_phone_hash: string;
        name: string | null;
        phone: string | null;
        tier: DonorTier;
        notes: string | null;
        total_donated: number;
        donation_count: number;
    };
    donations: import("@/types").DonationInput[];
}

export interface BroadcastTemplate {
    id: number;
    name: string;
    content: string;
    created_at: string;
}

export type ReportCategory = "tahunan" | "keuangan" | "program";

export interface ReportItem {
    id: number;
    title: string;
    slug: string;
    category: ReportCategory;
    year: number | null;
    description: string | null;
    cover_url: string | null;
    file_url: string | null;
    is_published: boolean;
    order: number;
    created_at: string;
}

export interface AppNotification {
    id: number;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

export interface SettingField {
    key: string;
    label: string;
    type: "text" | "textarea" | "image";
    value?: string | null;
    url?: string | null;
}
export interface SettingGroup {
    key: string;
    label: string;
    fields: SettingField[];
}

export interface LedgerEntry {
    date: string;
    type: "masuk" | "keluar";
    description: string;
    ref: string | null;
    amount: number;
    balance: number;
}
export interface LedgerSummary {
    total_masuk: number;
    total_keluar: number;
    saldo: number;
}

