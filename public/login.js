const API_LOGIN = "/api/auth/login";

const form = document.getElementById("login-form");
const statusEl = document.getElementById("status");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const togglePasswordBtn = document.getElementById("toggle-password");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? "error" : "success";
}

togglePasswordBtn.addEventListener("click", () => {
  const hidden = passwordEl.type === "password";
  passwordEl.type = hidden ? "text" : "password";
  togglePasswordBtn.textContent = hidden ? "Hide" : "Show";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  const payload = {
    email: emailEl.value.trim(),
    password: passwordEl.value
  };

  if (!payload.email || !payload.password) {
    setStatus("Email and password are required.", true);
    return;
  }

  try {
    const res = await fetch(API_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed.");
    }
    setStatus(`Login successful. Welcome ${data.user.username}.`);
    window.location.href = `./profile.html?email=${encodeURIComponent(data.user.email)}`;
  } catch (err) {
    setStatus(err.message, true);
  }
});
