const API_SIGNUP = "/api/auth/signup";
const API_GOOGLE_SIGNUP = "/api/auth/google";
const GOOGLE_CLIENT_ID = "REPLACE_WITH_GOOGLE_CLIENT_ID";

const form = document.getElementById("signup-form");
const statusEl = document.getElementById("status");
const passwordEl = document.getElementById("password");
const togglePasswordBtn = document.getElementById("toggle-password");
const googleSignupBtn = document.getElementById("google-signup");
const usernameEl = document.getElementById("username");
const emailEl = document.getElementById("email");

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
    username: usernameEl.value.trim(),
    email: emailEl.value.trim(),
    password: passwordEl.value
  };

  if (!payload.username || !payload.email || !payload.password) {
    setStatus("Username, email, and password are required.", true);
    return;
  }
  if (payload.password.length < 8) {
    setStatus("Password must be at least 8 characters.", true);
    return;
  }

  try {
    const res = await fetch(API_SIGNUP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Signup failed.");
    }
    setStatus(`Signup complete for ${data.username} (${data.email})`);
    form.reset();
  } catch (err) {
    setStatus(err.message, true);
  }
});

function handleGoogleCredential(response) {
  const username = usernameEl.value.trim();
  if (!username) {
    setStatus("Enter a username first, then click Google signup again.", true);
    return;
  }

  fetch(API_GOOGLE_SIGNUP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      credential: response.credential
    })
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google signup failed.");
      }
      setStatus(`Google signup complete for ${data.username} (${data.email})`);
    })
    .catch((err) => {
      setStatus(err.message, true);
    });
}

googleSignupBtn.addEventListener("click", () => {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    setStatus("Google script did not load. Check internet access and try again.", true);
    return;
  }
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "REPLACE_WITH_GOOGLE_CLIENT_ID") {
    setStatus("Set GOOGLE_CLIENT_ID in signup.js before using Google signup.", true);
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential
  });
  window.google.accounts.id.prompt();
});
