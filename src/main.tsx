import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { suppressPortalErrors } from "./utils/portalCleanup";

// Supprimer les erreurs de Portal cleanup en développement
if (import.meta.env.DEV) {
  suppressPortalErrors();
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
