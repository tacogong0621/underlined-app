import { useState, useEffect, useRef, useMemo } from "react";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp,
  getDocs, Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const PIN_COLORS = ["#e74c3c", "#3498db", "#27ae60", "#8e44ad"];
const CARD_ROTATIONS = [-2, -1, 0, 1, 2];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ───── Quote Card ───── */
function QuoteCard({ q, userId, onToggleLike, onOpenComments }) {
  const pin = useMemo(() => randomFrom(PIN_COLORS), []);
  const rot = useMemo(() => randomFrom(CARD_ROTATIONS), []);
  const liked = q.likedBy?.includes(userId);

  return (
    <div style={{ ...cardStyles.card, transform: `rotate(${rot}deg)` }}>
      <div style={{ ...cardStyles.pin, background: pin }} />
      <p style={cardStyles.quote}>{q.text}</p>
      {q.source && <p style={cardStyles.source}>- {q.source}</p>}
      {q.author && <p style={cardStyles.author}>{q.author}</p>}
      <p style={cardStyles.date}>{q.dateLabel}</p>
      <div style={cardStyles.actions}>
        <button style={cardStyles.actionBtn} onClick={() => onToggleLike(q)}>
          <span style={{ color: liked ? "#e74c3c" : "#999", fontSize: 18 }}>
            {liked ? "\u2665" : "\u2661"}
          </span>
          <span style={cardStyles.count}>{q.likedBy?.length || 0}</span>
        </button>
        <button style={cardStyles.actionBtn} onClick={() => onOpenComments(q)}>
          <span style={{ fontSize: 16 }}>{"\uD83D\uDCAC"}</span>
          <span style={cardStyles.count}>{q.commentCount || 0}</span>
        </button>
      </div>
    </div>
  );
}

/* ───── Comment Modal ───── */
function CommentModal({ quoteId, userId, userName, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const ref = collection(db, "quotes", quoteId, "comments");
    const q = query(ref, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [quoteId]);

  const submit = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "quotes", quoteId, "comments"), {
      text: text.trim(),
      userId,
      userName,
      createdAt: serverTimestamp(),
    });
    const qRef = doc(db, "quotes", quoteId);
    const newCount = comments.length + 1;
    await updateDoc(qRef, { commentCount: newCount });
    setText("");
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600 }}>Comments</span>
          <button style={modalStyles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div style={modalStyles.list}>
          {comments.map((c) => (
            <div key={c.id} style={modalStyles.comment}>
              <strong style={{ fontSize: 13 }}>{c.userName}</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{c.text}</p>
            </div>
          ))}
          {comments.length === 0 && <p style={{ color: "#999", fontSize: 14 }}>No comments yet.</p>}
        </div>
        <div style={modalStyles.inputRow}>
          <input
            style={modalStyles.input}
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button style={modalStyles.sendBtn} onClick={submit}>Post</button>
        </div>
      </div>
    </div>
  );
}

/* ───── New Quote Form ───── */
function QuoteForm({ userId, userName, onClose }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "quotes"), {
      text: text.trim(),
      source: source.trim(),
      author: author.trim(),
      dateLabel: date,
      userId,
      userName,
      likedBy: [],
      commentCount: 0,
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...formStyles.card }} onClick={(e) => e.stopPropagation()}>
        <p style={formStyles.heading}>What is your sentence today?</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={formStyles.dateInput} />
        <textarea
          style={formStyles.textarea}
          placeholder="Write your line..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <input style={formStyles.input} placeholder="Source (book, song, poem...)" value={source} onChange={(e) => setSource(e.target.value)} />
        <input style={formStyles.input} placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <button style={formStyles.pinBtn} onClick={submit} disabled={saving}>
          {saving ? "Pinning..." : "Pin it"}
        </button>
      </div>
    </div>
  );
}

/* ───── AI Reflect Modal ───── */
function ReflectModal({ quotes, onClose }) {
  const [summary, setSummary] = useState("");
  const [books, setBooks] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBooks, setShowBooks] = useState(false);

  useEffect(() => {
    const lines = quotes.map((q) => `"${q.text}" - ${q.source || "unknown"}`).join("\n");
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": localStorage.getItem("anthropic_api_key") || "",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Here are someone's highlighted lines this month:\n${lines}\n\nWrite a 2-sentence poetic monthly summary reflecting their reading soul. Then after a blank line, suggest 3 books they might love, each on its own line prefixed with a bullet.`,
        }],
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const full = data.content?.[0]?.text || "Could not generate summary.";
        const parts = full.split(/\n\n/);
        setSummary(parts[0] || full);
        setBooks(parts.slice(1).join("\n\n"));
        setLoading(false);
      })
      .catch(() => {
        setSummary("Could not connect to AI service.");
        setLoading(false);
      });
  }, [quotes]);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.box, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600 }}>Monthly Reflection</span>
          <button style={modalStyles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: "#888", fontFamily: "'IM Fell English', serif" }}>Reflecting...</p>
        ) : (
          <div style={{ padding: 20 }}>
            <p style={{ fontFamily: "'IM Fell English', serif", fontSize: 15, lineHeight: 1.7, color: "#333" }}>{summary}</p>
            {books && !showBooks && (
              <button
                style={{ ...formStyles.pinBtn, marginTop: 16, background: "#1a1a1a" }}
                onClick={() => setShowBooks(true)}
              >
                See what to read next
              </button>
            )}
            {showBooks && (
              <p style={{ marginTop: 16, fontFamily: "'IM Fell English', serif", fontSize: 14, lineHeight: 1.8, color: "#555", whiteSpace: "pre-wrap" }}>{books}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Main Underlined Component ───── */
export default function Underlined({ user }) {
  const [tab, setTab] = useState("board");
  const [myQuotes, setMyQuotes] = useState([]);
  const [feedQuotes, setFeedQuotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [reflectQuotes, setReflectQuotes] = useState(null);
  const boardRef = useRef(null);

  // My quotes
  useEffect(() => {
    const q = query(
      collection(db, "quotes"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setMyQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user.uid]);

  // Feed quotes
  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setFeedQuotes(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((x) => x.userId !== user.uid)
      );
    });
  }, [user.uid]);

  const toggleLike = async (q) => {
    const ref = doc(db, "quotes", q.id);
    const liked = q.likedBy?.includes(user.uid);
    await updateDoc(ref, {
      likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const handleShare = async () => {
    if (!boardRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(boardRef.current, { backgroundColor: "#fff" });
    const link = document.createElement("a");
    link.download = "my-underlined-board.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  // Group by month
  const grouped = useMemo(() => {
    const map = {};
    myQuotes.forEach((q) => {
      const d = q.dateLabel || "Unknown";
      const key = d.substring(0, 7); // YYYY-MM
      if (!map[key]) map[key] = [];
      map[key].push(q);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [myQuotes]);

  // Feed grouped by user
  const feedGrouped = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayQuotes = feedQuotes.filter((q) => q.dateLabel === today);
    const rest = feedQuotes.filter((q) => q.dateLabel !== today);
    const byUser = {};
    rest.forEach((q) => {
      const key = q.userName || "Anonymous";
      if (!byUser[key]) byUser[key] = [];
      byUser[key].push(q);
    });
    return { todayQuotes, byUser: Object.entries(byUser) };
  }, [feedQuotes]);

  const monthName = (key) => {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div style={mainStyles.wrap}>
      {/* Header */}
      <header style={mainStyles.header}>
        <h1 style={mainStyles.logo}>Underlined</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={mainStyles.iconBtn} onClick={handleShare} title="Share board">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
          <img
            src={user.photoURL || ""}
            alt=""
            style={mainStyles.avatar}
            onClick={() => { if (confirm("Sign out?")) auth.signOut(); }}
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      {/* Content */}
      <main style={mainStyles.content}>
        {tab === "board" ? (
          <div ref={boardRef}>
            {grouped.map(([key, quotes]) => (
              <section key={key} style={{ marginBottom: 24 }}>
                <div style={mainStyles.monthHeader}>
                  <span style={mainStyles.monthTitle}>{monthName(key)} &middot; {quotes.length} lines</span>
                  {quotes.length >= 3 && (
                    <button style={mainStyles.reflectBtn} onClick={() => setReflectQuotes(quotes)}>
                      Reflect
                    </button>
                  )}
                </div>
                <div style={mainStyles.masonry} className="masonry-override">
                  {quotes.map((q) => (
                    <QuoteCard
                      key={q.id}
                      q={q}
                      userId={user.uid}
                      onToggleLike={toggleLike}
                      onOpenComments={(q) => setCommentTarget(q)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {myQuotes.length === 0 && (
              <p style={{ textAlign: "center", color: "#aaa", fontFamily: "'IM Fell English', serif", marginTop: 60 }}>
                Your board is empty. Pin your first line.
              </p>
            )}
          </div>
        ) : (
          <div>
            {feedGrouped.todayQuotes.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <p style={mainStyles.monthTitle}>Today</p>
                <div style={mainStyles.masonry}>
                  {feedGrouped.todayQuotes.map((q) => (
                    <QuoteCard key={q.id} q={q} userId={user.uid} onToggleLike={toggleLike} onOpenComments={(q) => setCommentTarget(q)} />
                  ))}
                </div>
              </section>
            )}
            {feedGrouped.byUser.map(([name, quotes]) => (
              <section key={name} style={{ marginBottom: 24 }}>
                <p style={mainStyles.monthTitle}>{name}</p>
                <div style={mainStyles.masonry} className="masonry-override">
                  {quotes.map((q) => (
                    <QuoteCard key={q.id} q={q} userId={user.uid} onToggleLike={toggleLike} onOpenComments={(q) => setCommentTarget(q)} />
                  ))}
                </div>
              </section>
            ))}
            {feedQuotes.length === 0 && (
              <p style={{ textAlign: "center", color: "#aaa", fontFamily: "'IM Fell English', serif", marginTop: 60 }}>
                No one else has posted yet.
              </p>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      {tab === "board" && (
        <button style={mainStyles.fab} onClick={() => setShowForm(true)}>+</button>
      )}

      {/* Tab bar */}
      <nav style={mainStyles.tabBar}>
        <button style={tab === "board" ? mainStyles.tabActive : mainStyles.tab} onClick={() => setTab("board")}>
          My Board
        </button>
        <button style={tab === "feed" ? mainStyles.tabActive : mainStyles.tab} onClick={() => setTab("feed")}>
          Feed
        </button>
      </nav>

      {/* Modals */}
      {showForm && <QuoteForm userId={user.uid} userName={user.displayName} onClose={() => setShowForm(false)} />}
      {commentTarget && (
        <CommentModal
          quoteId={commentTarget.id}
          userId={user.uid}
          userName={user.displayName}
          onClose={() => setCommentTarget(null)}
        />
      )}
      {reflectQuotes && <ReflectModal quotes={reflectQuotes} onClose={() => setReflectQuotes(null)} />}
    </div>
  );
}

/* ───── Styles ───── */
const mainStyles = {
  wrap: {
    minHeight: "100dvh",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'IM Fell English', serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #eee",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 10,
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 24,
    fontWeight: 500,
    color: "#1a1a1a",
    margin: 0,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    cursor: "pointer",
    objectFit: "cover",
    minWidth: 44,
    minHeight: 44,
    padding: 4,
  },
  content: {
    flex: 1,
    padding: "16px 12px 100px",
    overflowY: "auto",
  },
  monthHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: "0 4px",
  },
  monthTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
    fontWeight: 600,
    color: "#555",
  },
  reflectBtn: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 13,
    color: "#8e44ad",
    background: "none",
    border: "1px solid #8e44ad",
    borderRadius: 20,
    padding: "6px 14px",
    cursor: "pointer",
    minHeight: 44,
  },
  masonry: {
    columnCount: 2,
    columnGap: 10,
  },
  fab: {
    position: "fixed",
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#1a1a1a",
    color: "#fff",
    fontSize: 28,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  tabBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    background: "#fff",
    borderTop: "1px solid #eee",
    zIndex: 10,
  },
  tab: {
    flex: 1,
    padding: "14px 0",
    background: "none",
    border: "none",
    fontFamily: "'IM Fell English', serif",
    fontSize: 15,
    color: "#aaa",
    cursor: "pointer",
    minHeight: 50,
  },
  tabActive: {
    flex: 1,
    padding: "14px 0",
    background: "none",
    border: "none",
    fontFamily: "'IM Fell English', serif",
    fontSize: 15,
    color: "#1a1a1a",
    cursor: "pointer",
    fontWeight: 600,
    borderTop: "2px solid #1a1a1a",
    minHeight: 50,
  },
};

const cardStyles = {
  card: {
    background: "linear-gradient(to bottom, #fdf6e3 0%, #fdf6e3 100%)",
    backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, #e8dcc8 28px)`,
    backgroundColor: "#fdf6e3",
    borderRadius: 6,
    padding: "20px 14px 12px",
    marginBottom: 10,
    breakInside: "avoid",
    position: "relative",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  pin: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
  },
  quote: {
    fontFamily: "'Kalam', cursive",
    fontSize: 15,
    lineHeight: 1.75,
    color: "#333",
    margin: "0 0 8px",
    wordBreak: "break-word",
  },
  source: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 12,
    color: "#888",
    margin: "0 0 2px",
    fontStyle: "italic",
  },
  author: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 12,
    color: "#999",
    margin: "0 0 4px",
  },
  date: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 11,
    color: "#bbb",
    margin: "0 0 8px",
  },
  actions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: 4,
    minWidth: 44,
    minHeight: 44,
  },
  count: {
    fontSize: 12,
    color: "#999",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
    padding: 0,
  },
  box: {
    background: "#fff",
    borderRadius: "16px 16px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "80dvh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #eee",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 24,
    cursor: "pointer",
    color: "#999",
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 20px",
  },
  comment: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #f0f0f0",
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #eee",
  },
  input: {
    flex: 1,
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "'IM Fell English', serif",
    outline: "none",
    minHeight: 44,
  },
  sendBtn: {
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontFamily: "'IM Fell English', serif",
    fontSize: 14,
    cursor: "pointer",
    minHeight: 44,
  },
};

const formStyles = {
  card: {
    background: "linear-gradient(to bottom, #fdf6e3 0%, #fdf6e3 100%)",
    backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, #e8dcc8 28px)`,
    backgroundColor: "#fdf6e3",
    borderRadius: "16px 16px 0 0",
    padding: "24px 20px",
    width: "100%",
    maxWidth: 480,
    maxHeight: "85dvh",
    overflowY: "auto",
  },
  heading: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 20,
    color: "#555",
    margin: "0 0 16px",
  },
  dateInput: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 14,
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "8px 12px",
    marginBottom: 12,
    width: "100%",
    boxSizing: "border-box",
    minHeight: 44,
  },
  textarea: {
    fontFamily: "'Kalam', cursive",
    fontSize: 16,
    border: "none",
    background: "transparent",
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    outline: "none",
    lineHeight: 1.75,
    marginBottom: 12,
    minHeight: 100,
  },
  input: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 14,
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "8px 12px",
    marginBottom: 10,
    width: "100%",
    boxSizing: "border-box",
    minHeight: 44,
  },
  pinBtn: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 16,
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 0",
    width: "100%",
    cursor: "pointer",
    marginTop: 4,
    minHeight: 48,
  },
};
