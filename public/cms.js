const output = document.getElementById("cms-output");

async function api(path, payload) {
  const res = await fetch(path, {
    method: payload ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
    credentials: "same-origin"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function show(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

async function ensureCmsSession() {
  const res = await fetch("/api/cms/me", { credentials: "same-origin" });
  if (!res.ok) {
    window.location.href = "./cms-login.html";
    throw new Error("Not authenticated.");
  }
}

document.getElementById("restaurant-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/cms/restaurants", {
      name: document.getElementById("restaurantName").value.trim()
    });
    show({ createdRestaurant: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("team-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/cms/teams", {
      restaurantId: document.getElementById("teamRestaurantId").value.trim(),
      name: document.getElementById("teamName").value.trim()
    });
    show({ createdTeam: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("course-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/cms/courses", {
      restaurantId: document.getElementById("courseRestaurantId").value.trim(),
      title: document.getElementById("courseTitle").value.trim(),
      description: document.getElementById("courseDescription").value.trim(),
      contentType: "multiple_choice_video"
    });
    show({ createdCourse: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("module-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/cms/modules", {
      courseId: document.getElementById("moduleCourseId").value.trim(),
      title: document.getElementById("moduleTitle").value.trim(),
      position: Number(document.getElementById("modulePosition").value || 1)
    });
    show({ createdModule: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("question-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const options = document
      .getElementById("questionOptions")
      .value.split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const data = await api("/api/cms/questions", {
      moduleId: document.getElementById("questionModuleId").value.trim(),
      prompt: document.getElementById("questionPrompt").value.trim(),
      options,
      correctOptionIndex: Number(document.getElementById("questionCorrectIndex").value || 0),
      videoUrl: document.getElementById("questionVideoUrl").value.trim() || null,
      position: 1
    });
    show({ createdQuestion: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("release-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const localValue = document.getElementById("releaseAt").value;
    const data = await api("/api/cms/releases", {
      courseId: document.getElementById("releaseCourseId").value.trim(),
      releaseAt: new Date(localValue).toISOString()
    });
    show({ release: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("assignment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/cms/assignments", {
      courseId: document.getElementById("assignmentCourseId").value.trim(),
      teamId: document.getElementById("assignmentTeamId").value.trim()
    });
    show({ assignment: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("user-team-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/cms/users/team", {
      email: document.getElementById("assignUserEmail").value.trim(),
      teamId: document.getElementById("assignUserTeamId").value.trim()
    });
    show({ userTeam: data });
  } catch (error) {
    show({ error: error.message });
  }
});

document.getElementById("refresh-template").addEventListener("click", async () => {
  try {
    const data = await api("/api/cms/template");
    show(data);
  } catch (error) {
    show({ error: error.message });
  }
});

ensureCmsSession().then(async () => {
  try {
    const data = await api("/api/cms/template");
    show(data);
  } catch (error) {
    show({ error: error.message });
  }
});
