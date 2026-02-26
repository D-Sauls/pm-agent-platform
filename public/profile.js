const output = document.getElementById("profile-output");
const params = new URLSearchParams(window.location.search);
const email = (params.get("email") || "").trim().toLowerCase();

if (!email) {
  output.textContent = "No user email provided. Login again.";
} else {
  fetch(`/api/cms/user/profile?email=${encodeURIComponent(email)}`)
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile.");
      output.textContent = JSON.stringify(data, null, 2);
    })
    .catch((error) => {
      output.textContent = error.message;
    });
}
