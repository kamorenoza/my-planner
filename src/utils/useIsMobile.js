import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

// Returns true when the viewport is in the mobile range. Updates on resize so
// layout switches happen live when rotating / resizing.
export function useIsMobile(query = MOBILE_QUERY) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return isMobile;
}
