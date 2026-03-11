import { useAuth } from "../hooks/useAuth";

export default function Landing() {
  const { signIn } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <h1 style={styles.title}>Underlined</h1>
        <p style={styles.tagline}>The lines that found you</p>
        <button style={styles.button} onClick={signIn}>
          <svg style={styles.gLogo} viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    padding: 24,
  },
  inner: {
    textAlign: "center",
    maxWidth: 360,
    width: "100%",
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 48,
    fontWeight: 500,
    color: "#1a1a1a",
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
  },
  tagline: {
    fontFamily: "'IM Fell English', serif",
    fontSize: 16,
    color: "#888",
    margin: "0 0 48px",
    fontWeight: 400,
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 28px",
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    fontFamily: "'IM Fell English', serif",
    fontSize: 16,
    color: "#333",
    cursor: "pointer",
    transition: "box-shadow 0.2s",
    minHeight: 48,
  },
  gLogo: {
    width: 20,
    height: 20,
    flexShrink: 0,
  },
};
