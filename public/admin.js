const form = document.getElementById("capacity-form");
const results = document.getElementById("results");

function paramsFromForm() {
  const fd = new FormData(form);
  return new URLSearchParams({
    activeUsers: String(fd.get("activeUsers") || document.getElementById("activeUsers").value),
    avgVideoMb: String(fd.get("avgVideoMb") || document.getElementById("avgVideoMb").value),
    viewsPerUserPerMonth: String(
      fd.get("viewsPerUserPerMonth") || document.getElementById("viewsPerUserPerMonth").value
    ),
    avgStreamMbps: String(fd.get("avgStreamMbps") || document.getElementById("avgStreamMbps").value),
    uplinkMbps: String(fd.get("uplinkMbps") || document.getElementById("uplinkMbps").value)
  });
}

async function loadCapacity() {
  const query = paramsFromForm().toString();
  const res = await fetch(`/api/admin/capacity?${query}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not load capacity data.");
  }
  results.textContent = JSON.stringify(data, null, 2);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  results.textContent = "Calculating...";
  try {
    await loadCapacity();
  } catch (error) {
    results.textContent = error.message;
  }
});

loadCapacity().catch((error) => {
  results.textContent = error.message;
});
