"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookDetail, BookListItem } from "@/types/books";

interface SearchPayload {
  results: BookListItem[];
  total: number;
  page: number;
  limit: number;
}

const TRENDING_QUERIES = [
  "Global classics",
  "Marathi literature",
  "Science fiction",
  "Self help",
  "Biographies",
  "AI research",
];

export default function SearchAgent() {
  const [inputValue, setInputValue] = useState("World literature");
  const [query, setQuery] = useState("World literature");
  const [results, setResults] = useState<BookListItem[]>([]);
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pdfOnly, setPdfOnly] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: query,
          page: `${page}`,
        });
        if (pdfOnly) params.set("pdfOnly", "true");
        const response = await fetch(`/api/books?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const payload = (await response.json()) as SearchPayload;
        setResults(payload.results);
        setTotal(payload.total);
        if (payload.results.length) {
          setDetail((current) => {
            if (
              current &&
              payload.results.some((item) => item.workKey === current.workKey)
            ) {
              return current;
            }
            void loadDetail(payload.results[0].workKey);
            return current;
          });
        } else {
          setDetail(null);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("एजंट सध्या पुस्तकांची माहिती आणू शकला नाही.");
        }
      } finally {
        setLoading(false);
      }
    };
    performSearch();
    return () => controller.abort();
  }, [query, page, pdfOnly]);

  const totalPages = useMemo(() => {
    if (!total) return 0;
    return Math.min(50, Math.ceil(total / 12));
  }, [total]);

  async function loadDetail(workKey: string) {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/books/${workKey}`);
      if (!response.ok) {
        throw new Error("Unable to load detail");
      }
      const payload = (await response.json()) as BookDetail;
      setDetail(payload);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("सविस्तर माहिती लोड करता आली नाही.");
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inputValue.trim()) return;
    setPage(1);
    setQuery(inputValue.trim());
  }

  function handleSelect(workKey: string) {
    void loadDetail(workKey);
  }

  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr,0.9fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-lg">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 md:flex-row md:items-center"
          >
            <label className="flex-1">
              <span className="block text-sm font-semibold uppercase text-white/70 tracking-wide">
                एजंट साठी शोध प्रश्न
              </span>
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="उदा: भारतीय इतिहास किंवा विज्ञान कथा"
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
            >
              शोधा
            </button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {TRENDING_QUERIES.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setInputValue(item);
                  setPage(1);
                  setQuery(item);
                }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/20"
                type="button"
              >
                {item}
              </button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-white/80">
              <input
                type="checkbox"
                checked={pdfOnly}
                onChange={(event) => {
                  setPage(1);
                  setPdfOnly(event.target.checked);
                }}
                className="h-4 w-4 rounded border-white/40 bg-transparent text-indigo-500 focus:ring-indigo-400"
              />
              फक्त PDF उपलब्ध पुस्तके
            </label>
          </div>
        </div>
        <AgentStatus
          loading={loading}
          total={total}
          query={query}
          error={error}
          pdfOnly={pdfOnly}
        />
        <div className="grid gap-4">
          {results.map((result) => (
            <article
              key={result.workKey}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg backdrop-blur-md transition hover:border-indigo-400/60"
            >
              <div className="flex flex-col gap-4 md:flex-row">
                {result.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.coverUrl}
                    alt={result.title}
                    className="h-40 w-28 flex-none rounded-lg object-cover shadow-inner"
                  />
                ) : (
                  <div className="flex h-40 w-28 flex-none items-center justify-center rounded-lg bg-slate-900/40 text-sm text-white/60">
                    No cover
                  </div>
                )}
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
                      {result.availability === "pdf"
                        ? "PDF Ready"
                        : result.availability === "online"
                        ? "Full Text"
                        : "Metadata"}
                    </span>
                    {result.firstPublishYear ? (
                      <span className="rounded-full bg-slate-900/40 px-3 py-1 text-xs text-white/70">
                        {result.firstPublishYear}
                      </span>
                    ) : null}
                    {result.pageCount ? (
                      <span className="rounded-full bg-slate-900/40 px-3 py-1 text-xs text-white/70">
                        ~{result.pageCount} pages
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {result.title}
                  </h3>
                  {result.authors.length ? (
                    <p className="text-sm text-indigo-100">
                      लेखक: {result.authors.join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-3 line-clamp-3 text-sm text-white/80">
                    {result.snippet ?? "या शीर्षकाबाबत एजंटने अतिरिक्त तपशील शोधले आहेत."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelect(result.workKey)}
                      className="rounded-lg bg-indigo-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                    >
                      एजंटची सूचना
                    </button>
                    {result.pdfUrl ? (
                      <a
                        href={result.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                      >
                        PDF डाउनलोड
                      </a>
                    ) : (
                      <a
                        href={result.readUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                      >
                        Open Library
                      </a>
                    )}
                  </div>
                  {result.subjects.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.subjects.slice(0, 6).map((subject) => (
                        <span
                          key={subject}
                          className="rounded-full bg-slate-900/50 px-3 py-1 text-xs text-white/70"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {!loading && !results.length ? (
            <div className="rounded-2xl border border-white/20 bg-white/5 p-8 text-center text-white/80">
              या शोधासाठी कोणतेही नोंद सापडले नाहीत. दुसरा विषय वापरून पाहा.
            </div>
          ) : null}
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            <div>
              पान {page} / {totalPages} • एकूण निकाल {total}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1 || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-lg border border-white/20 px-4 py-2 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                मागील
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border border-white/20 px-4 py-2 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                पुढील
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-500/20 via-white/10 to-transparent p-6 backdrop-blur-md shadow-xl">
          <h2 className="text-2xl font-semibold text-white">
            एजंट इंसाईट्स
          </h2>
          <p className="mt-2 text-sm text-white/80">
            निवडलेल्या पुस्तकावर आधारित वैयक्तिक सूचनांसाठी एजंट कार्यरत आहे.
          </p>
          {detailLoading ? (
            <div className="mt-6 animate-pulse space-y-4">
              <div className="h-4 rounded bg-white/20" />
              <div className="h-4 rounded bg-white/10" />
              <div className="h-4 rounded bg-white/10" />
            </div>
          ) : detail ? (
            <div className="mt-6 space-y-5 text-white">
              <div>
                <h3 className="text-xl font-semibold">{detail.title}</h3>
                {detail.authors.length ? (
                  <p className="text-sm text-indigo-100">
                    {detail.authors.join(", ")}
                  </p>
                ) : null}
              </div>
              {detail.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.coverUrl}
                  alt={detail.title}
                  className="h-48 w-full rounded-xl object-cover shadow-lg"
                />
              ) : null}
              <p className="text-sm text-white/80">
                {detail.description ?? detail.insights.quickSummary}
              </p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h4 className="text-sm font-semibold uppercase text-white/70">
                  एजंट सारांश
                </h4>
                <p className="mt-2 text-sm text-white/80">
                  {detail.insights.quickSummary}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase text-white/70">
                  योग्य वाचक
                </h4>
                <ul className="mt-2 space-y-2 text-sm text-white/80">
                  {detail.insights.idealFor.map((item) => (
                    <li key={item} className="rounded-lg bg-white/10 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                <h4 className="text-sm font-semibold uppercase text-white/60">
                  वाचन साथी
                </h4>
                <p className="mt-2">{detail.insights.readingCompanion}</p>
              </div>
              {detail.pdfOptions.length ? (
                <div>
                  <h4 className="text-sm font-semibold uppercase text-white/70">
                    PDF पर्याय
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm">
                    {detail.pdfOptions.map((option) => (
                      <li
                        key={option.url}
                        className="flex items-center justify-between rounded-lg bg-indigo-500/10 px-3 py-2"
                      >
                        <span className="text-white/90">{option.label}</span>
                        <a
                          href={option.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-indigo-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-400"
                        >
                          डाउनलोड
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/30 px-4 py-3 text-sm text-white/70">
                  या शीर्षकासाठी थेट PDF नोंदी उपलब्ध नाहीत. Open Library वरील
                  वाचन पर्याय तपासा.
                </div>
              )}
              {detail.timeline.length ? (
                <div>
                  <h4 className="text-sm font-semibold uppercase text-white/70">
                    प्रकाशन टाइमलाइन
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    {detail.timeline.map((event) => (
                      <li
                        key={`${event.label}-${event.value}`}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2"
                      >
                        <span>{event.label}</span>
                        <span className="font-semibold text-white">
                          {event.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail.relatedSubjects.length ? (
                <div>
                  <h4 className="text-sm font-semibold uppercase text-white/70">
                    संबंधित विषय
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.relatedSubjects.map((subject) => (
                      <span
                        key={subject}
                        className="rounded-full bg-black/20 px-3 py-1 text-xs text-white/80"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <a
                href={detail.readUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                Open Library वर संपूर्ण माहिती
              </a>
            </div>
          ) : (
            <div className="mt-6 text-sm text-white/70">
              शोध सुरू करण्यासाठी पुस्तक निवडा.
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/20 bg-black/30 p-6 text-sm text-white/70 backdrop-blur">
          <h3 className="text-lg font-semibold text-white">
            एजंट कसा कार्य करतो?
          </h3>
          <p className="mt-2">
            Open Library मधील जागतिक डेटासेट वापरून हा एजंट तुमच्यासाठी शीर्षक
            शोधतो, वर्णने तयार करतो आणि उपलब्ध PDF दुवे ओळखतो. तुम्ही विचारल्याप्रमाणे माहिती मराठीत सादर केली जाते.
          </p>
        </div>
      </aside>
    </section>
  );
}

interface AgentStatusProps {
  loading: boolean;
  total: number;
  query: string;
  error: string | null;
  pdfOnly: boolean;
}

function AgentStatus({
  loading,
  total,
  query,
  error,
  pdfOnly,
}: AgentStatusProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-4 text-sm text-indigo-50">
        <span className="h-3 w-3 animate-ping rounded-full bg-indigo-300" />
        एजंट{" "}
        <span className="font-semibold text-white">“{query}”</span> साठी जागतिक
        पुस्तकांचे विश्लेषण करत आहे…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
      एजंटला{" "}
      <span className="font-semibold text-white">“{query}”</span> साठी{" "}
      <span className="font-semibold text-white">{total}</span> नोंदी सापडल्या.
      {pdfOnly ? " फक्त PDF उपलब्ध पुस्तके दाखवली आहेत." : ""}
    </div>
  );
}
