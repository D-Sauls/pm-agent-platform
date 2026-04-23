import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { resolveTenantRuntime, withBasePath } from "./pwa/runtime";
import "./styles.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const runtime = resolveTenantRuntime(window.location);
    void navigator.serviceWorker.register(withBasePath(runtime.basePath, "/sw.js"), {
      scope: withBasePath(runtime.basePath, "/")
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
