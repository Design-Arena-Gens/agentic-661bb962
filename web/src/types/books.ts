export interface BookListItem {
  key: string;
  workKey: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  firstPublishYear?: number | null;
  languages: string[];
  subjects: string[];
  coverUrl?: string | null;
  readUrl: string;
  pdfUrl?: string | null;
  availability: "pdf" | "online" | "unknown";
  snippet?: string | null;
  editionKey?: string | null;
  pageCount?: number | null;
}

export interface BookDetail extends BookListItem {
  description?: string | null;
  excerpts: string[];
  insights: BookInsight;
  pdfOptions: PdfOption[];
  relatedSubjects: string[];
  timeline: TimelineEvent[];
}

export interface BookInsight {
  quickSummary: string;
  idealFor: string[];
  readingCompanion: string;
}

export interface PdfOption {
  label: string;
  url: string;
  source: string;
}

export interface TimelineEvent {
  label: string;
  value: string;
}
