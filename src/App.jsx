import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, API_BASE } from "./api.js";

function Layout({ children }) {
  return (
    <div className="page">
      <header className="header">
        <Link className="brand" to="/">Poll Maker</Link>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}

function Home() {
  const location = useLocation();
  const isDeepLinking = new URLSearchParams(location.search).get("deepLink") === "1";
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <Layout>
      <section className="hero card">
        <span className="eyebrow">MERN + LTI 1.3 MVP</span>
        <h1>Create and share polls</h1>
        <p>
          Create a question, generate a shareable link, let people vote,
          and view live results.
        </p>

        {me?.authenticated ? (
          <div className="actions">
            <Link
              className="button primary"
              to="/create"
              state={isDeepLinking ? { returnToDeepLink: true } : undefined}
            >
              Create Poll
            </Link>
          </div>
        ) : (
          <div className="actions">
            <Link className="button primary" to="/login?mode=register">Create account</Link>
          </div>
        )}

        <div className="status">
          <strong>{me?.authenticated ? "Signed in:" : "Not signed in"}</strong>{" "}
          {me?.authType === "lti" ? "through Aula/LTI" : me?.user?.email || ""}
        </div>

        {me?.authType === "lti" && (
          <div className="lti-box">
            <div><strong>User:</strong> {me.user?.userId}</div>
            <div><strong>Course:</strong> {me.user?.contextTitle || me.user?.contextId || "—"}</div>
            <div><strong>Roles:</strong> {me.user?.roles?.join(", ") || "—"}</div>
          </div>
        )}

        <div className="dev-links">
          <a href={`${API_BASE}/health`} target="_blank" rel="noreferrer">
            Backend health
          </a>
          <a href={`${API_BASE}/lti/jwks`} target="_blank" rel="noreferrer">
            Tool JWKS
          </a>
        </div>
      </section>
    </Layout>
  );
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    api.me()
      .then((session) => setStatus(session.authenticated ? "authenticated" : "anonymous"))
      .catch(() => setStatus("anonymous"));
  }, []);

  if (status === "loading") return <Layout><section className="card"><p>Checking session...</p></section></Layout>;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return children;
}

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).get("mode") === "login"
      ? "login"
      : "register"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const action = mode === "login" ? api.login : api.register;
      await action({ email, password });
      if (mode === "register") {
        setMode("login");
        setEmail("");
        setPassword("");
        setNotice("Account created. Please sign in.");
        navigate("/login", { replace: true });
        return;
      }
      navigate("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="card form-card">
        <span className="eyebrow">Poll Maker</span>
        <h2>{mode === "login" ? "Sign in" : "Create an account"}</h2>
        <p className="muted">Aula users are signed in automatically after an LTI launch.</p>

        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength="8" required />

          {notice && <div className="success">{notice}</div>}
          {error && <div className="error">{error}</div>}

          <button className="button primary full" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="text-button"
          onClick={() => setMode((current) => current === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </section>
    </Layout>
  );
}

function CreatePoll() {
  const navigate = useNavigate();
  const location = useLocation();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateOption(index, value) {
    setOptions((current) =>
      current.map((item, i) => (i === index ? value : item))
    );
  }

  function addOption() {
    setOptions((current) => [...current, ""]);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const poll = await api.createPoll({ question, options });
      if (location.state?.returnToDeepLink) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${API_BASE}/lti/deep-linking/respond`;

        const pollIds = document.createElement("input");
        pollIds.type = "hidden";
        pollIds.name = "pollIds";
        pollIds.value = poll.id;
        form.appendChild(pollIds);

        document.body.appendChild(form);
        form.submit();
        return;
      }

      navigate(`/poll/${poll.id}?created=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="card form-card">
        <span className="eyebrow">Create</span>
        <h2>Create Poll</h2>

        <form onSubmit={submit}>
          <label>Question</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What is your favorite language?"
            required
          />

          <label>Options</label>
          {options.map((option, index) => (
            <input
              key={index}
              className="poll-option-input"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              required
            />
          ))}

          <button type="button" className="button secondary" onClick={addOption}>
            + Add option
          </button>

          {error && <div className="error">{error}</div>}

          <button className="button primary full" disabled={loading}>
            {loading ? "Creating..." : "Create Poll"}
          </button>
        </form>
      </section>
    </Layout>
  );
}

function Poll() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const shareInputRef = useRef(null);

  async function load() {
    try {
      setPoll(await api.getPoll(id));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function submitVote() {
    if (!selected) {
      setMessage("Please select an option.");
      return;
    }

    try {
      const updated = await api.vote(id, selected);
      setPoll(updated);
      setMessage("Vote recorded!");
    } catch (e) {
      setError(e.message);
    }
  }

  async function copyShareLink() {
    const shareUrl = window.location.href;
    setCopyStatus("");
    const fallbackCopy = () => {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const copied = document.execCommand("copy");
      textArea.remove();
      return copied;
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (!fallbackCopy()) {
        throw new Error("Clipboard access is unavailable.");
      }

      setCopyStatus("Link copied!");
    } catch {
      // LMS iframes and some browsers block the modern Clipboard API.
      if (fallbackCopy()) {
        setCopyStatus("Link copied!");
        return;
      }

      shareInputRef.current?.focus();
      shareInputRef.current?.select();
      setCopyStatus("Clipboard is blocked by the LMS. Press Ctrl/Cmd+C to copy.");
    }
  }

  if (error) {
    return <Layout><section className="card"><div className="error">{error}</div></section></Layout>;
  }

  if (!poll) {
    return <Layout><section className="card"><p>Loading poll...</p></section></Layout>;
  }

  const totalVotes = poll.options.reduce((sum, item) => sum + item.votes, 0);

  return (
    <Layout>
      <section className="card">
        <span className="eyebrow">Poll</span>
        <h2>{poll.question}</h2>

        <div className="options">
          {poll.options.map((option) => (
            <label className="option" key={option.id}>
              <input
                type="radio"
                name="poll"
                value={option.id}
                checked={selected === option.id}
                onChange={(e) => setSelected(e.target.value)}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>

        <button className="button primary full" onClick={submitVote}>
          Vote
        </button>

        {message && <div className="success">{message}</div>}

        <div className="results">
          <h3>Results</h3>
          {poll.options.map((option) => {
            const percentage = totalVotes
              ? Math.round((option.votes / totalVotes) * 100)
              : 0;

            return (
              <div className="result-row" key={option.id}>
                <div className="result-label">
                  <span>{option.text}</span>
                  <span>{percentage}% · {option.votes} vote(s)</span>
                </div>
                <div className="bar">
                  <div style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="share">
          <strong>Share this poll:</strong>
          <input
            ref={shareInputRef}
            readOnly
            value={window.location.href}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="button secondary"
            onClick={copyShareLink}
          >
            Copy link
          </button>
          {copyStatus && <div className="success">{copyStatus}</div>}
        </div>
      </section>
    </Layout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><CreatePoll /></ProtectedRoute>} />
      <Route
        path="/deep-link"
        element={<Navigate to="/create" replace state={{ returnToDeepLink: true }} />}
      />
      <Route path="/poll/:id" element={<Poll />} />
    </Routes>
  );
}

export default App;
