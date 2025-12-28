import { NextResponse } from "next/server";
import { BookDetail, PdfOption, TimelineEvent } from "@/types/books";
import {
  normalizeDescription,
  pdfUrlFromIdentifiers,
  workUrl,
  coverUrlFromDoc,
} from "@/lib/openlibrary";
import {
  buildIdealFor,
  buildReadingCompanion,
  summarizeDescription,
} from "@/lib/insights";

const USER_AGENT = "AgenticLibrary/1.0 (https://agentic-661bb962.vercel.app)";

interface OpenLibraryWork {
  title?: string;
  description?: string | { value?: string };
  subjects?: string[];
  subject_places?: string[];
  subject_times?: string[];
  subject_people?: string[];
  first_publish_date?: string;
  created?: { value?: string };
  authors?: { author: { key: string } }[];
}

interface OpenLibraryEdition {
  key: string;
  title?: string;
  number_of_pages?: number;
  publishers?: string[];
  publish_date?: string;
  ocaid?: string;
  languages?: { key: string }[];
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;

  if (!slug?.length) {
    return NextResponse.json({ error: "Missing work key" }, { status: 400 });
  }

  const workKey = slug.join("/");

  const workResponse = await fetch(
    `https://openlibrary.org/${workKey}.json`,
    {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 60 * 60 },
    },
  );

  if (workResponse.status === 404) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }

  if (!workResponse.ok) {
    return NextResponse.json(
      { error: "Failed to load work metadata" },
      { status: workResponse.status },
    );
  }

  const workData = (await workResponse.json()) as OpenLibraryWork;

  const editionsResponse = await fetch(
    `https://openlibrary.org/${workKey}/editions.json?limit=15`,
    {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 60 * 30 },
    },
  );

  let editions: OpenLibraryEdition[] = [];
  if (editionsResponse.ok) {
    const editionsPayload = await editionsResponse.json();
    editions = editionsPayload.entries ?? [];
  }

  const bestEdition = editions.find((edition) => edition.ocaid) ?? editions[0];
  const pdfOptions: PdfOption[] = editions
    .filter((edition) => edition.ocaid)
    .map((edition) => ({
      label: edition.title ?? workData.title ?? "Edition",
      url: `https://archive.org/download/${edition.ocaid}/${edition.ocaid}.pdf`,
      source: "Internet Archive",
    }));

  const primarySubjects = Array.from(
    new Set([
      ...(workData.subjects ?? []),
      ...(workData.subject_places ?? []),
      ...(workData.subject_people ?? []),
      ...(workData.subject_times ?? []),
    ]),
  );

  const agentsQuickSummary = summarizeDescription(
    normalizeDescription(workData.description),
  );

  const timeline: TimelineEvent[] = [];
  if (workData.first_publish_date) {
    timeline.push({
      label: "पहिली प्रकाशन तारीख",
      value: workData.first_publish_date,
    });
  }
  if (bestEdition?.publish_date) {
    timeline.push({
      label: "लोकप्रिय आवृत्ती",
      value: bestEdition.publish_date,
    });
  }
  if (workData.created?.value) {
    const createdYear = workData.created.value.slice(0, 10);
    timeline.push({
      label: "आर्काइव्ह मध्ये जोडले",
      value: createdYear,
    });
  }

  const authors = await resolveAuthors(workData.authors ?? []);

  const detail: BookDetail = {
    key: `/${workKey}`,
    workKey,
    title: workData.title ?? "Untitled",
    subtitle: null,
    authors,
    firstPublishYear: workData.first_publish_date
      ? Number.parseInt(workData.first_publish_date.slice(0, 4))
      : null,
    languages:
      bestEdition?.languages?.map((lang) => lang.key.split("/").pop() ?? "") ??
      [],
    subjects: primarySubjects.slice(0, 12),
    coverUrl: bestEdition ? coverUrlFromDoc(bestEdition) : null,
    readUrl: workUrl(workKey),
    pdfUrl: pdfUrlFromIdentifiers(bestEdition),
    availability: pdfOptions.length ? "pdf" : "unknown",
    snippet: agentsQuickSummary,
    editionKey: bestEdition?.key ?? null,
    pageCount: bestEdition?.number_of_pages ?? null,
    description: normalizeDescription(workData.description),
    excerpts: buildExcerpts(editions),
    insights: {
      quickSummary: agentsQuickSummary,
      idealFor: buildIdealFor(primarySubjects, authors),
      readingCompanion: buildReadingCompanion(primarySubjects, authors),
    },
    pdfOptions,
    relatedSubjects: primarySubjects.slice(0, 8),
    timeline,
  };

  return NextResponse.json(detail);
}

async function resolveAuthors(
  entries: { author: { key: string } }[],
): Promise<string[]> {
  const lookups = await Promise.all(
    entries.slice(0, 3).map(async (entry) => {
      const key = entry.author.key.replace(/^\//, "");
      try {
        const response = await fetch(`https://openlibrary.org/${key}.json`, {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: 60 * 60 * 24 },
        });
        if (!response.ok) return null;
        const data = (await response.json()) as { personal_name?: string; name?: string };
        return data.personal_name ?? data.name ?? null;
      } catch {
        return null;
      }
    }),
  );

  return lookups.filter((name): name is string => Boolean(name));
}

function buildExcerpts(editions: OpenLibraryEdition[]) {
  const descriptive = editions
    .map((edition) => edition.publishers?.join(", "))
    .filter(Boolean) as string[];

  const pageCounts = editions
    .map((edition) => edition.number_of_pages)
    .filter((value): value is number => typeof value === "number");

  const excerpts: string[] = [];
  if (descriptive.length) {
    excerpts.push(`प्रकाशक: ${Array.from(new Set(descriptive)).slice(0, 3).join(", ")}`);
  }
  if (pageCounts.length) {
    const avg =
      pageCounts.reduce((total, current) => total + current, 0) /
      pageCounts.length;
    excerpts.push(`साधारण पृष्ठ संख्या: ${Math.round(avg)}`);
  }
  if (!excerpts.length) {
    excerpts.push("उपलब्ध आवृत्तीची विस्तृत माहिती लवकरच जोडली जाईल.");
  }
  return excerpts;
}
