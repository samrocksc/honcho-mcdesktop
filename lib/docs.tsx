export type DocEntry = {
  readonly title: string
  readonly content: React.ReactNode
}

const statsDoc: DocEntry = {
  title: "Stats",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>This page shows how much stuff Honcho has been saving, and when.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Time window</h4>
        <p className="text-base-content/70">How far back you want to look. Pick 7d for the last week, 30d for the last month, and so on.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What to count</h4>
        <ul className="space-y-1 text-base-content/70">
          <li><strong className="text-base-content">conclusions</strong> — facts Honcho has written down about people</li>
          <li><strong className="text-base-content">messages</strong> — individual chat messages</li>
          <li><strong className="text-base-content">both</strong> — conclusions and messages added together</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">The chart</h4>
        <p className="text-base-content/70">Each line is one workspace. Hover over any day to see the exact numbers.</p>
      </div>
    </div>
  ),
};

const diagnoseDoc: DocEntry = {
  title: "Diagnose",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>Ask a question and see exactly what Honcho knows — before you trust it with anything important.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Observer</h4>
        <p className="text-base-content/70">Who is asking the question. Honcho answers from this person's point of view.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Target</h4>
        <p className="text-base-content/70">Who the question is <em>about</em>. Usually the same as the observer. Tick the checkbox to ask about someone else.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Reasoning level</h4>
        <p className="text-base-content/70">How hard Honcho thinks before answering. <strong className="text-base-content">low</strong> is quick. <strong className="text-base-content">max</strong> is slow but thorough.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What you get back</h4>
        <ul className="space-y-1 text-base-content/70">
          <li><strong className="text-base-content">Honcho answer</strong> — the actual answer an AI would receive</li>
          <li><strong className="text-base-content">Peer card</strong> — a short list of facts about this person</li>
          <li><strong className="text-base-content">Context</strong> — everything combined that the AI would see</li>
          <li><strong className="text-base-content">Message recall</strong> — old messages that matched your question</li>
        </ul>
      </div>
    </div>
  ),
};

const peerDetailDoc: DocEntry = {
  title: "Peer",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>A peer is a person (or AI) that Honcho has been learning about. This page shows everything it knows.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Representation</h4>
        <p className="text-base-content/70">A written summary of what Honcho has figured out about this person over time. It updates as more conversations happen.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Context</h4>
        <p className="text-base-content/70">What an AI assistant would actually be told about this person when they ask a question.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Sessions</h4>
        <p className="text-base-content/70">Past conversations this person was part of. Click one to read the full chat.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Merge into peer</h4>
        <p className="text-base-content/70">Copies all conclusions from this peer to another, then reassigns all sessions. Useful for consolidating duplicates (e.g. &ldquo;Sam&rdquo; and &ldquo;sam&rdquo;). The source peer stays in Honcho but is left empty — the API does not support deletion.</p>
      </div>
    </div>
  ),
};

const sessionDetailDoc: DocEntry = {
  title: "Session",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>A session is one conversation. This page shows every message in it, oldest first.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Messages</h4>
        <p className="text-base-content/70">Each bubble shows who sent it, whether they were the human or the AI, and what they said. Honcho reads these to learn about people over time.</p>
      </div>
    </div>
  ),
};

const workspaceDetailDoc: DocEntry = {
  title: "Workspace",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>A workspace is like a folder. Everything inside it — people, chats, and facts — belongs together.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Peers tab</h4>
        <p className="text-base-content/70">The people (or AIs) Honcho knows about in this workspace. Click someone to see what Honcho has learned about them.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Sessions tab</h4>
        <p className="text-base-content/70">Past conversations. Click one to read the full chat from start to finish.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Conclusions tab</h4>
        <p className="text-base-content/70">Facts Honcho has written down. You can search them — just pick who is asking and who it's about first.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Chat tab</h4>
        <p className="text-base-content/70"><strong className="text-base-content">Peer Chat</strong> — ask a person a question and get an answer based on what Honcho knows. <strong className="text-base-content">Workspace Search</strong> — search through all the messages in this workspace.</p>
      </div>
    </div>
  ),
};

const workspacesListDoc: DocEntry = {
  title: "Workspaces",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>These are all the workspaces in your Honcho instance. Click any card to open it.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What is a workspace?</h4>
        <p className="text-base-content/70">Think of it like a project folder. The people, chats, and facts inside one workspace are kept separate from those in another.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What can I do inside?</h4>
        <p className="text-base-content/70">Browse the people Honcho knows, read past conversations, search facts, or ask a question directly.</p>
      </div>
    </div>
  ),
};

const fallbackDoc: DocEntry = {
  title: "Honcho Helpdesk",
  content: (
    <div className="text-sm text-base-content/60 leading-relaxed">
      <p>No documentation for this page yet.</p>
    </div>
  ),
};

const learnDoc: DocEntry = {
  title: "Learn",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>This page explains how Honcho works and what the terms in this dashboard mean.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">New here?</h4>
        <p className="text-base-content/70">Start at the top — the memory loop diagram shows the full picture in three steps.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Looking up a term?</h4>
        <p className="text-base-content/70">The Key concepts section covers Workspace, Peer, Session, Conclusion, Representation, and Context — each with a plain-English explanation and a technical note.</p>
      </div>
    </div>
  ),
};

export function getDoc(pathname: string): DocEntry {
  if (pathname.includes("/peers/")) return peerDetailDoc;
  if (pathname.includes("/sessions/")) return sessionDetailDoc;
  if (pathname.startsWith("/workspaces/")) return workspaceDetailDoc;
  if (pathname.startsWith("/stats")) return statsDoc;
  if (pathname.startsWith("/diagnose")) return diagnoseDoc;
  if (pathname.startsWith("/learn")) return learnDoc;
  if (pathname === "/") return workspacesListDoc;
  return fallbackDoc;
}
