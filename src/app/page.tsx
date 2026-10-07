import { SessionGate } from "@/components/focuscasex/session-gate";

// Auth is resolved client-side (cookie + Bearer token fallback) so the app
// also works in embedded browsers that block cookies entirely.
export default function Home() {
  return <SessionGate />;
}
