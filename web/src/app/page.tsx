import SearchAgent from "@/components/search-agent";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 md:px-10 lg:px-16">
        <header className="space-y-6 rounded-3xl border border-white/10 bg-white/10 p-10 text-white shadow-2xl backdrop-blur">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-1 text-sm font-semibold text-indigo-100">
            Agentic GranthSagar · जागतिक ज्ञान तुमच्या डिव्हाइसवर
          </span>
          <h1 className="text-4xl font-bold leading-snug md:text-5xl">
            जगभरातील ग्रंथांची माहिती शोधणारा स्वयंचलित AI एजंट, थेट PDF
            दुव्यांसह.
          </h1>
          <p className="max-w-3xl text-lg text-indigo-100">
            तुम्ही विचारलेला कोणताही विषय द्या. एजंट Open Library सारख्या जागतिक
            स्रोतांमधून माहिती गोळा करतो, तुमच्यासाठी मराठीत सारांश तयार करतो आणि
            उपलब्ध असल्यास PDF डाउनलोडसुद्धा उपलब्ध करून देतो.
          </p>
        </header>
        <SearchAgent />
      </main>
    </div>
  );
}
