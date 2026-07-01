import { useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./views/Dashboard";
import YearView from "./views/YearView";
import MonthView from "./views/MonthView";
import WeekView from "./views/WeekView";
import DayView from "./views/DayView";
import Comidas from "./views/Comidas";
import Metas from "./views/Metas";
import GoalView from "./views/GoalView";
import MedicationHome from "./views/MedicationHome";
import CreateTreatmentPlan from "./views/CreateTreatmentPlan";
import TreatmentPlanDetails from "./views/TreatmentPlanDetails";
import Login from "./views/Login";
import SideMenu from "./components/SideMenu";
import { useAuth } from "./context/AuthContext";
import { seedHolidays } from "./utils/holidaysCO";
import { listenForegroundMessages } from "./database/messaging";

const LAST_ROUTE_KEY = "last-route";

function LoadingScreen({ message }) {
  return (
    <div className="app-loading">
      <div className="app-loading__spinner" />
      <p className="app-loading__text">{message}</p>
    </div>
  );
}

// Saves the current route to localStorage and, on first load, restores the
// last route the user was on. Kept local-only (never synced to the cloud).
function LastRouteTracker() {
  const location = useLocation();
  const navigate = useNavigate();
  const restored = useRef(false);

  // Restore the last route once on mount, only when starting at the root path.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (location.pathname === "/") {
      const last = localStorage.getItem(LAST_ROUTE_KEY);
      if (last && last !== "/") {
        navigate(last, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the current route, but only after the initial restore has run so
  // we never overwrite the saved route with the temporary root path.
  useEffect(() => {
    if (!restored.current) return;
    localStorage.setItem(LAST_ROUTE_KEY, location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  const { user, loading, syncing, dataVersion } = useAuth();

  // Seed Colombian holidays once the user is in, regardless of the entry route,
  // so 2026 (and the current year) get their holidays automatically. Re-runs
  // after a background cloud sync (dataVersion) so a pull can't strip them.
  useEffect(() => {
    if (!user) return;
    seedHolidays(2026);
    seedHolidays(new Date().getFullYear());
  }, [user, dataVersion]);

  // Show push notifications that arrive while the app is open.
  useEffect(() => {
    if (!user) return;
    let unsub = () => {};
    listenForegroundMessages().then((fn) => {
      unsub = fn;
    });
    return () => unsub();
  }, [user]);

  if (loading) return <LoadingScreen message="Cargando…" />;
  if (!user) return <Login />;
  if (syncing)
    return <LoadingScreen message="Sincronizando tu planificador…" />;

  return (
    <>
      <LastRouteTracker />
      <Routes key={dataVersion}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/comidas" element={<Comidas />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/metas/:id" element={<GoalView />} />
        <Route path="/medications" element={<MedicationHome />} />
        <Route path="/medications/new" element={<CreateTreatmentPlan />} />
        <Route path="/medications/:id/edit" element={<CreateTreatmentPlan />} />
        <Route path="/medications/:id" element={<TreatmentPlanDetails />} />
        <Route path="/year/:year" element={<YearView />} />
        <Route path="/year/:year/month/:month" element={<MonthView />} />
        <Route path="/year/:year/week/:week" element={<WeekView />} />
        <Route path="/year/:year/month/:month/day/:day" element={<DayView />} />
      </Routes>
      <SideMenu />
    </>
  );
}

export default App;