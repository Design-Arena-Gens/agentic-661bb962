import { NextResponse } from "next/server";
import {
  buildSearchUrl,
  coverUrlFromDoc,
  pdfUrlFromIdentifiers,
  workUrl,
} from "@/lib/openlibrary";
import { BookListItem } from "@/types/books";

interface SearchDocument {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  language?: string[];
  subject?: string[];
  cover_i?: number;
  edition_key?: string[];
  ia?: string[];
  has_fulltext?: boolean;
  first_sentence?: string | string[];
  number_of_pages_median?: number;
}

const USER_AGENT = "AgenticLibrary/1.0 (https://agentic-661bb962.vercel.app)";
const DEFAULT_LIMIT = 12;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 },
    );
  }

  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(
    DEFAULT_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`)),
  );
  const pdfOnly = searchParams.get("pdfOnly") === "true";

  const upstreamUrl = buildSearchUrl(query, page, limit);

  const response = await fetch(upstreamUrl, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to reach Open Library" },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as {
    docs?: SearchDocument[];
    numFound?: number;
  };
  const docs = payload.docs ?? [];

  const results: BookListItem[] = docs
    .map((doc) => {
      const workKey = (doc.key as string).replace(/^\//, "");
      const pdfUrl = pdfUrlFromIdentifiers(doc);
      const availability = pdfUrl
        ? "pdf"
        : doc.has_fulltext
        ? "online"
        : "unknown";
      const snippet =
        Array.isArray(doc.first_sentence) && doc.first_sentence.length
          ? doc.first_sentence
              .map((sentence: string) => sentence.replace(/['"]+/g, ""))
              .join(" ")
          : typeof doc.first_sentence === "string"
          ? doc.first_sentence.replace(/['"]+/g, "")
          : doc.subtitle ?? null;

      return {
        key: doc.key,
        workKey,
        title: doc.title,
        subtitle: doc.subtitle ?? null,
        authors: doc.author_name ?? [],
        firstPublishYear: doc.first_publish_year ?? null,
        languages: doc.language ?? [],
        subjects: (doc.subject ?? []).slice(0, 10),
        coverUrl: coverUrlFromDoc(doc),
        readUrl: workUrl(workKey),
        pdfUrl,
        availability,
        snippet,
        editionKey: doc.edition_key?.[0] ?? null,
        pageCount: doc.number_of_pages_median ?? null,
      } satisfies BookListItem;
    })
    .filter((item) => (pdfOnly ? Boolean(item.pdfUrl) : true));

  return NextResponse.json({
    total: payload.numFound ?? results.length,
    page,
    limit,
    results,
  });
}
