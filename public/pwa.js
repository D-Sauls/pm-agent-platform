(() => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (_error) {
      // Keep signup/login working even if SW registration fails.
    }
  });
})();
