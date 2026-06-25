import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ReviewQueue } from './pages/ReviewQueue';
import { ScopeBuilder } from './pages/ScopeBuilder';
import { ActivityAudit } from './pages/ActivityAudit';
import { useAppStore } from './store';
import { getDefaultRouteForRole } from './store';

function DefaultRedirect() {
  const activeUser = useAppStore((s) => s.getActiveUser());
  return <Navigate to={getDefaultRouteForRole(activeUser.role)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="/scope" element={<ScopeBuilder />} />
          <Route path="/queue" element={<ReviewQueue />} />
          <Route path="/queue/:itemId" element={<ReviewQueue />} />
          <Route path="/audit" element={<ActivityAudit />} />
          <Route path="/audit/:eventId" element={<ActivityAudit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
