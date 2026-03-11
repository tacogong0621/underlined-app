import { useAuth } from "./hooks/useAuth";
import Landing from "./components/Landing";
import Underlined from "./components/Underlined";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 28, color: "#1a1a1a" }}>
          Underlined
        </span>
      </div>
    );
  }

  return user ? <Underlined user={user} /> : <Landing />;
}
