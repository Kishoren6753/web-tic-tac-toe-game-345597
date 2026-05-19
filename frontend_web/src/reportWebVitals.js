/* eslint-disable no-console */
/**
 * Optional performance reporting hook.
 * CRA calls this only if you wire it up; we keep it for completeness.
 */
export default function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Lazy-load to avoid impacting main bundle.
    import("web-vitals").then(
      ({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      }
    );
  }
}
