export default function LearnPage() {
  return (
    <div className="space-y-12 max-w-3xl">

      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">What is Honcho?</h1>
        <p className="mt-3 text-lg text-base-content/70 leading-relaxed">
          Honcho gives your AI a memory. Instead of starting from scratch every conversation,
          it quietly builds up a picture of each person: their preferences, habits, and
          patterns, and feeds that back to the AI before it responds.
        </p>
        <p className="mt-2 text-sm text-base-content/50">
          Under the hood: Honcho is an open-source user context and memory server. Your app
          writes conversations to it via API, and Honcho handles extraction, storage, and retrieval.
        </p>
      </div>

      <div className="divider" />

      {/* How it works */}
      <div>
        <h2 className="text-xl font-semibold mb-6">How the memory loop works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step
            number={1}
            title="You have a conversation"
            plain="You chat with an AI app. Every message is sent to Honcho in the background."
            technical="Your app posts user and assistant turns to POST /sessions/{id}/messages"
          />
          <Step
            number={2}
            title="Honcho takes notes"
            plain="Honcho reads those messages and writes down facts it finds: your preferred tools, your timezone, how you like to communicate."
            technical="An LLM extracts atomic conclusions and updates the peer representation"
          />
          <Step
            number={3}
            title="Your AI remembers you"
            plain="Next time you ask a question, the AI is told what Honcho knows about you before it answers. It feels like it remembers you, because it does."
            technical="Your app calls GET /peers/{id}/context, receives the representation, and injects it into the system prompt"
          />
        </div>
      </div>

      <div className="divider" />

      {/* Key concepts */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Key concepts</h2>
        <p className="text-sm text-base-content/50 mb-6">
          Honcho uses a handful of terms throughout this dashboard. Here&apos;s what they actually mean.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Concept
            term="Workspace"
            plain="A separate memory bank for one app or project. Everything inside it (the people, conversations, and facts) is kept together and apart from other workspaces."
            technical={<>Maps to <code className="text-xs bg-base-200 px-1 rounded">app_id</code> in the Honcho API. Use one workspace per product or deployment.</>}
            href="/"
            linkLabel="Browse workspaces"
          />
          <Concept
            term="Peer"
            plain="A person (or AI) that Honcho has been learning about. As they have more conversations, Honcho builds up a richer picture of them."
            technical={<>Identified by a string ID. Peers belong to a workspace and accumulate conclusions and a representation over time.</>}
            href="/workspaces"
            linkLabel="View a peer"
          />
          <Concept
            term="Session"
            plain="A single conversation. One session contains all the messages from a chat between a person and an AI."
            technical={<>Sessions are scoped to a workspace. Messages within a session are what Honcho reads to extract conclusions.</>}
          />
          <Concept
            term="Conclusion"
            plain="A single fact Honcho has written down about a person, like 'prefers Python over JavaScript' or 'based in London'. These are the building blocks of memory."
            technical={<>Conclusions are stored per peer, per workspace. They feed into the representation that gets served at context retrieval time.</>}
          />
          <Concept
            term="Representation"
            plain="A running summary of everything Honcho has learned about a person. Think of it as a contact card that updates itself over time."
            technical={<>Built from accumulated conclusions. Returned by GET /peers/{`{id}`}/representation and included in context responses.</>}
          />
          <Concept
            term="Context"
            plain="What the AI actually receives before it answers your question: a combination of the representation and any relevant past messages that match what you asked."
            technical={<>Returned by GET /peers/{`{id}`}/context?query=... The combined payload your app injects into the LLM system prompt.</>}
          />
        </div>
      </div>

      <div className="divider" />

      {/* What you can do */}
      <div>
        <h2 className="text-xl font-semibold mb-2">What you can do in this dashboard</h2>
        <p className="text-sm text-base-content/50 mb-6">
          This is a read/write interface for your Honcho instance.
        </p>
        <div className="space-y-3">
          <Action
            href="/"
            title="Browse workspaces and peers"
            description="See every workspace and drill into the people Honcho knows, their facts, and their conversations."
          />
          <Action
            href="/diagnose"
            title="Diagnose a query"
            description="Ask a test question and see exactly what context Honcho would return, useful for debugging before you ship."
          />
          <Action
            href="/stats"
            title="Check activity stats"
            description="View message volume, how fresh the stored facts are, and which peers have the most coverage."
          />
          <Action
            href="/workspaces"
            title="Import notes"
            description="Upload markdown files (daily notes, knowledge docs) and Honcho will extract conclusions from them automatically."
          />
        </div>
      </div>

      <div className="divider" />

      {/* Comparison table */}
      <div>
        <h2 className="text-xl font-semibold mb-2">honcho.dev cloud vs. Honcho Helpdesk</h2>
        <p className="text-sm text-base-content/50 mb-6">
          Plastic Labs offers a managed cloud dashboard at{" "}
          <a href="https://honcho.dev" target="_blank" rel="noopener noreferrer" className="link link-primary">honcho.dev</a>.
          {" "}This dashboard is built for teams that self-host. Here is what each covers.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-base-200">
                <th className="text-left py-2 pr-4 font-medium text-base-content/60 w-1/2">Feature</th>
                <th className="text-center py-2 px-4 font-medium text-base-content/60 w-1/4">honcho.dev</th>
                <th className="text-center py-2 px-4 font-medium text-base-content/60 w-1/4">Helpdesk</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={i} className={`border-b border-base-200/50 ${row.section ? "bg-base-200/30" : ""}`}>
                  {row.section ? (
                    <td colSpan={3} className="py-2 px-0 text-xs font-semibold text-base-content/40 uppercase tracking-wide pt-4">
                      {row.section}
                    </td>
                  ) : (
                    <>
                      <td className="py-2 pr-4 text-base-content/80">{row.feature}</td>
                      <td className="py-2 px-4 text-center">
                        <Check value={row.cloud!} />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <Check value={row.helpdesk!} />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-base-content/40 mt-3">
          Cloud pricing (honcho.dev): $2/million tokens ingested, context() free and unlimited, .chat() from $0.001 to $0.50/query. New accounts get $100 in free credits.
        </p>
      </div>

      <div className="divider" />

      {/* Footer */}
      <div className="text-sm text-base-content/50 space-y-2 pb-6">
        <p>
          Every page in this dashboard has a <strong className="text-base-content/70">? docs</strong> button
          in the top-right corner that explains that specific screen.
        </p>
        <p>
          For the full Honcho API reference and self-hosting guide, visit{" "}
          <a
            href="https://docs.honcho.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            docs.honcho.dev
          </a>
          .
        </p>
      </div>

    </div>
  );
}

type ComparisonRow =
  | { section: string; feature?: never; cloud?: never; helpdesk?: never }
  | { feature: string; cloud: boolean | "partial"; helpdesk: boolean | "partial"; section?: never }

const COMPARISON_ROWS: ComparisonRow[] = [
  { section: "Browsing" },
  { feature: "Browse workspaces and peers",      cloud: true,      helpdesk: true },
  { feature: "Read full message threads",         cloud: true,      helpdesk: true },
  { feature: "Manage conclusions (search/delete)",cloud: "partial", helpdesk: true },
  { section: "Querying" },
  { feature: "Chat with a peer (ask questions)",  cloud: true,      helpdesk: true },
  { feature: "Workspace-wide semantic search",    cloud: false,     helpdesk: true },
  { feature: "Diagnose what your AI would see",   cloud: "partial", helpdesk: true },
  { feature: "API Playground with cURL export",   cloud: true,      helpdesk: false },
  { section: "Analytics" },
  { feature: "Activity stats and charts",         cloud: false,     helpdesk: true },
  { feature: "Conclusion freshness tracking",     cloud: false,     helpdesk: true },
  { feature: "Cross-workspace coverage matrix",   cloud: false,     helpdesk: true },
  { feature: "Peer activity heatmap",             cloud: false,     helpdesk: true },
  { section: "Memory management" },
  { feature: "Import markdown notes to memory",   cloud: false,     helpdesk: true },
  { feature: "Peer representation viewer",        cloud: true,      helpdesk: true },
  { feature: "Freshness-coloured entry timeline", cloud: false,     helpdesk: true },
  { section: "Infrastructure" },
  { feature: "Works with self-hosted Honcho",     cloud: false,     helpdesk: true },
  { feature: "Managed hosting (no server setup)", cloud: true,      helpdesk: false },
  { feature: "Dedicated per-org infrastructure",  cloud: true,      helpdesk: false },
  { feature: "Free to use (dashboard itself)",    cloud: true,      helpdesk: true },
];

function Check({ value }: { value: boolean | "partial" }) {
  if (value === true) return <span className="text-base-content">✓</span>;
  if (value === "partial") return <span className="text-base-content/40" title="Partial support">~</span>;
  return <span className="text-base-content/20">–</span>;
}

function Step({
  number,
  title,
  plain,
  technical,
}: {
  number: number
  title: string
  plain: string
  technical: string
}) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-neutral text-neutral-content text-xs font-bold flex items-center justify-center flex-shrink-0">
            {number}
          </span>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <p className="text-sm text-base-content/70 leading-relaxed">{plain}</p>
        <p className="text-xs text-base-content/40 font-mono leading-relaxed border-t border-base-200 pt-2 mt-1">
          {technical}
        </p>
      </div>
    </div>
  );
}

function Concept({
  term,
  plain,
  technical,
  href,
  linkLabel,
}: {
  term: string
  plain: string
  technical: React.ReactNode
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body p-4 space-y-2">
        <h3 className="font-semibold">{term}</h3>
        <p className="text-sm text-base-content/70 leading-relaxed">{plain}</p>
        <p className="text-xs text-base-content/40 leading-relaxed border-t border-base-200 pt-2">
          {technical}
        </p>
        {href && linkLabel && (
          <a href={href} className="text-xs link link-primary">{linkLabel} →</a>
        )}
      </div>
    </div>
  );
}

function Action({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg border border-base-200 hover:bg-base-100 transition-colors group"
    >
      <div className="flex-1">
        <p className="text-sm font-medium group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-base-content/50 mt-0.5">{description}</p>
      </div>
      <span className="text-base-content/30 group-hover:text-primary transition-colors mt-0.5">→</span>
    </a>
  );
}
