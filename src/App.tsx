import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AssetDetailPage, MarketPage } from "./pages/Market";
import { HomePage } from "./pages/Home";
import { Landing, ScenarioPage } from "./pages/Landing";
import { NewsPage } from "./pages/News";
import { PortfolioPage } from "./pages/Portfolio";
import { ResultPage } from "./pages/Result";
import { SettingsPage } from "./pages/Settings";
import { TradePage } from "./pages/Trade";
import { TutorialPage } from "./pages/Tutorial";
import { useGame } from "./store/GameProvider";

function PlayGate({ children }: { children: ReactNode }) {
  const { ready, state } = useGame();
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-mute">
        LOADING MARKET…
      </div>
    );
  }
  if (!state) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/scenarios" element={<ScenarioPage />} />
      <Route path="/tutorial" element={<TutorialPage />} />
      <Route
        path="/play"
        element={
          <PlayGate>
            <Layout />
          </PlayGate>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="market">
          <Route index element={<MarketPage />} />
          <Route path=":assetId" element={<AssetDetailPage />} />
        </Route>
        <Route path="news" element={<NewsPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="trade">
          <Route index element={<TradePage />} />
          <Route path=":assetId" element={<TradePage />} />
        </Route>
        <Route path="result" element={<ResultPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
