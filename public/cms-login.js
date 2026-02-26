const form = document.getElementById("cms-login-form");
const statusEl = document.getElementById("status");

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.className = error ? "error" : "success";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    setStatus("Email and password are required.", true);
    return;
  }

  try {
    const res = await fetch("/api/cms/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "same-origin"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "CMS login failed.");
    setStatus("Login successful. Redirecting...");
    window.location.href = "./cms.html";
  } catch (error) {
    setStatus(error.message, true);
  }
});
