/* =========================================================
   STUDYPAD
   V1 - Manual planner + notes + homework + tests + calendar
   ========================================================= */

const STORAGE_KEY = "studypad_users_v1";
const SESSION_KEY = "studypad_session_v1";

let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentUser = null;

let state = {
  selectedSubjectId: null,
  selectedTopicId: null,
  selectedSection: "notes",
  currentNoteId: null,
  weekOffset: 0
};


/* =========================
   HELPERS
========================= */

function uid() {
  return Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8);
}

function saveUsers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getUser() {
  return users.find(user => user.id === currentUser?.id);
}

function saveCurrentUser() {
  const index = users.findIndex(user => user.id === currentUser.id);

  if (index !== -1) {
    users[index] = currentUser;
    saveUsers();
  }
}

function escapeHTML(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHTML(html = "") {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.innerText;
}

function showToast(text) {
  const toast = document.getElementById("toast");

  toast.textContent = text;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
}

function getSelectedSubject() {
  return currentUser?.subjects.find(
    subject => subject.id === state.selectedSubjectId
  );
}

function getSelectedTopic() {
  const subject = getSelectedSubject();

  return subject?.topics.find(
    topic => topic.id === state.selectedTopicId
  );
}

function firstTopic() {
  if (!currentUser?.subjects.length) return;

  const firstSubject = currentUser.subjects[0];

  if (!firstSubject.topics.length) {
    state.selectedSubjectId = firstSubject.id;
    state.selectedTopicId = null;
    return;
  }

  state.selectedSubjectId = firstSubject.id;
  state.selectedTopicId = firstSubject.topics[0].id;
}


/* =========================
   AUTH
========================= */

document.querySelectorAll(".auth-tab").forEach(button => {
  button.addEventListener("click", () => {
    const mode = button.dataset.auth;

    document.querySelectorAll(".auth-tab").forEach(btn =>
      btn.classList.remove("active")
    );

    button.classList.add("active");

    document
      .getElementById("loginForm")
      .classList.toggle("hidden", mode !== "login");

    document
      .getElementById("signupForm")
      .classList.toggle("hidden", mode !== "signup");
  });
});


document.getElementById("signupForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const name =
      document.getElementById("signupName").value.trim();

    const grade =
      document.getElementById("signupGrade").value.trim();

    const username =
      document.getElementById("signupUsername").value.trim();

    const email =
      document.getElementById("signupEmail").value.trim();

    const password =
      document.getElementById("signupPassword").value;

    if (!name || !grade || !username || !email || !password) {
      showToast("Please fill in all fields.");
      return;
    }

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          grade,
          username
        }
      }
    });

    if (error) {
      showToast(error.message);
      return;
    }

    const authUser = data.user;

    if (!authUser) {
      showToast("Something went wrong. Please try again.");
      return;
    }

    const user = {
      id: authUser.id,
      name,
      grade,
      username,
      subjects: [],
      calendarEvents: []
    };

    const existingIndex =
      users.findIndex(item => item.id === user.id);

    if (existingIndex !== -1) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }

    saveUsers();

    if (!data.session) {
      showToast(
        "Account created! Check your email to confirm your account."
      );
      return;
    }

    currentUser = user;

    localStorage.setItem(
      SESSION_KEY,
      authUser.id
    );

    openApp();
  }
);


document.getElementById("loginForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const email =
      document.getElementById("loginEmail").value.trim();

    const password =
      document.getElementById("loginPassword").value;

    const { data, error } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    if (error || !data.user) {
      showToast("Wrong email or password.");
      return;
    }

    const authUser = data.user;

    let user =
      users.find(item => item.id === authUser.id);

    if (!user) {
      user = {
        id: authUser.id,
        name:
          authUser.user_metadata?.name ||
          "StudyPad User",
        grade:
          authUser.user_metadata?.grade ||
          "",
        username:
          authUser.user_metadata?.username ||
          "",
        subjects: [],
        calendarEvents: []
      };

      users.push(user);
      saveUsers();
    }

    currentUser = user;

    localStorage.setItem(
      SESSION_KEY,
      authUser.id
    );

    openApp();
  }
);


document.getElementById("logoutBtn").addEventListener(
  "click",
  async () => {
    await db.auth.signOut();

    localStorage.removeItem(SESSION_KEY);
    currentUser = null;

    document
      .getElementById("app")
      .classList.add("hidden");

    document
      .getElementById("authScreen")
      .classList.remove("hidden");
  }
);


function openApp() {
  document
    .getElementById("authScreen")
    .classList.add("hidden");

  document
    .getElementById("app")
    .classList.remove("hidden");

  firstTopic();

  renderApp();
}


/* =========================
   MAIN RENDER
========================= */

function renderApp() {
  renderProfile();
  renderSidebar();
  renderBreadcrumb();
  renderContent();
}


function renderProfile() {
  document.getElementById("profileName").textContent =
    currentUser.name;

  document.getElementById("profileGrade").textContent =
    `Grade ${currentUser.grade}`;

  document.getElementById("profileInitial").textContent =
    currentUser.name.charAt(0).toUpperCase();
}


function renderBreadcrumb() {
  const subject = getSelectedSubject();
  const topic = getSelectedTopic();

  const breadcrumb = document.getElementById("breadcrumb");

  if (!subject || !topic) {
    breadcrumb.textContent = "Choose a subject and topic";
    return;
  }

  breadcrumb.textContent =
    `${subject.name}  /  ${topic.name}`;
}


/* =========================
   SIDEBAR
========================= */

function renderSidebar() {
  const list = document.getElementById("subjectsList");

  list.innerHTML = "";

  currentUser.subjects.forEach(subject => {

    const wrapper = document.createElement("div");
    wrapper.className = "subject";
    wrapper.dataset.subjectId = subject.id;

    const badge =
      subject.name
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, " ");

    const expanded = subject.id === state.selectedSubjectId;

    wrapper.innerHTML = `
      <div class="subject-row" draggable="true">
        <button class="expand-btn">
          ${expanded ? "â¾" : "â¸"}
        </button>

        <div class="subject-badge"
          style="background:${subject.color}">
          ${badge}
        </div>

        <span class="subject-name">
          ${escapeHTML(subject.name)}
        </span>

        <button class="more-btn subject-more">â¯</button>
      </div>

      ${
        expanded
          ? `
          <div class="topic-list">
            ${subject.topics.map(topic => `
              <div
                class="topic-row ${
                  topic.id === state.selectedTopicId
                    ? "active"
                    : ""
                }"
                draggable="true"
                data-topic-id="${topic.id}"
              >
                <span class="topic-name">
                  ${escapeHTML(topic.name)}
                </span>

                <button class="more-btn topic-more">â¯</button>
              </div>
            `).join("")}

            <button class="add-topic">
              + Add Topic
            </button>
          </div>
        `
          : ""
      }
    `;

    list.appendChild(wrapper);

    const subjectRow = wrapper.querySelector(".subject-row");

    subjectRow.querySelector(".expand-btn").onclick = event => {
      event.stopPropagation();

      state.selectedSubjectId =
        expanded ? null : subject.id;

      renderApp();
    };

    subjectRow.querySelector(".subject-name").onclick = () => {
      state.selectedSubjectId = subject.id;

      if (subject.topics.length) {
        state.selectedTopicId = subject.topics[0].id;
      } else {
        state.selectedTopicId = null;
      }

      state.selectedSection = "notes";

      renderApp();
    };

    subjectRow.querySelector(".subject-more").onclick = event => {
      event.stopPropagation();
      showSubjectMenu(subject);
    };

    if (expanded) {

      wrapper.querySelectorAll(".topic-row").forEach(row => {
        const topicId = row.dataset.topicId;

        row.querySelector(".topic-name").onclick = () => {
          state.selectedSubjectId = subject.id;
          state.selectedTopicId = topicId;
          state.selectedSection = "notes";
          state.currentNoteId = null;

          renderApp();
        };

        row.querySelector(".topic-more").onclick = event => {
          event.stopPropagation();

          const topic = subject.topics.find(
            topic => topic.id === topicId
          );

          showTopicMenu(subject, topic);
        };
      });

      wrapper.querySelector(".add-topic").onclick = () => {
        openTopicModal(subject.id);
      };
    }
  });

  enableSidebarDragDrop();
}


/* =========================
   SUBJECTS
========================= */

document.getElementById("addSubjectBtn").onclick = () => {
  openSubjectModal();
};


function openSubjectModal(existingSubject = null) {

  const title =
    existingSubject ? "Edit Subject" : "Add Subject";

  openModal(`
    <h2>${title}</h2>

    <form id="subjectForm" class="modal-form">
      <label>
        Subject Name
        <input
          id="subjectName"
          required
          value="${existingSubject ? escapeHTML(existingSubject.name) : ""}"
          placeholder="Mathematics"
        />
      </label>

      <label>
        Subject Color
        <input
          id="subjectColor"
          type="color"
          value="${existingSubject?.color || "#ff4d4d"}"
        />
      </label>

      <div class="modal-actions">
        <button type="button" class="secondary-btn" id="cancelModal">
          Cancel
        </button>

        <button type="submit" class="primary-btn">
          ${existingSubject ? "Save" : "Create"}
        </button>
      </div>
    </form>
  `);

  document.getElementById("cancelModal").onclick = closeModal;

  document.getElementById("subjectForm").onsubmit = event => {
    event.preventDefault();

    const name =
      document.getElementById("subjectName").value.trim();

    const color =
      document.getElementById("subjectColor").value;

    if (existingSubject) {
      existingSubject.name = name;
      existingSubject.color = color;
    } else {
      const subject = {
        id: uid(),
        name,
        color,
        topics: []
      };

      currentUser.subjects.push(subject);

      state.selectedSubjectId = subject.id;
      state.selectedTopicId = null;
    }

    saveCurrentUser();
    closeModal();
    renderApp();
  };
}


function showSubjectMenu(subject) {
  openModal(`
    <h2>${escapeHTML(subject.name)}</h2>

    <div class="modal-actions"
      style="justify-content:flex-start; flex-wrap:wrap;">

      <button id="renameSubject" class="secondary-btn">
        Edit
      </button>

      <button id="deleteSubject" class="danger-btn">
        Delete
      </button>

      <button id="cancelSubjectMenu" class="secondary-btn">
        Cancel
      </button>
    </div>
  `);

  document.getElementById("renameSubject").onclick = () => {
    openSubjectModal(subject);
  };

  document.getElementById("cancelSubjectMenu").onclick = closeModal;

  document.getElementById("deleteSubject").onclick = () => {
    confirmDelete(
      `Delete ${subject.name}?`,
      "This will permanently delete all topics, notes, homework, tests and study data inside this subject.",
      () => {
        currentUser.subjects =
          currentUser.subjects.filter(
            item => item.id !== subject.id
          );

        firstTopic();
        saveCurrentUser();
        closeModal();
        renderApp();
      }
    );
  };
}


/* =========================
   TOPICS
========================= */

function openTopicModal(subjectId, existingTopic = null) {

  openModal(`
    <h2>
      ${existingTopic ? "Rename Topic" : "Add Topic"}
    </h2>

    <form id="topicForm" class="modal-form">

      <label>
        Topic Name
        <input
          id="topicName"
          required
          value="${existingTopic ? escapeHTML(existingTopic.name) : ""}"
          placeholder="Functions"
        />
      </label>

      <div class="modal-actions">
        <button type="button" id="cancelModal" class="secondary-btn">
          Cancel
        </button>

        <button type="submit" class="primary-btn">
          ${existingTopic ? "Save" : "Create"}
        </button>
      </div>
    </form>
  `);

  document.getElementById("cancelModal").onclick = closeModal;

  document.getElementById("topicForm").onsubmit = event => {
    event.preventDefault();

    const subject =
      currentUser.subjects.find(
        subject => subject.id === subjectId
      );

    const name =
      document.getElementById("topicName").value.trim();

    if (existingTopic) {
      existingTopic.name = name;
    } else {
      const topic = {
        id: uid(),
        name,
        notes: [],
        homework: [],
        tests: [],
        studySessions: []
      };

      subject.topics.push(topic);

      state.selectedSubjectId = subject.id;
      state.selectedTopicId = topic.id;
      state.selectedSection = "notes";
    }

    saveCurrentUser();
    closeModal();
    renderApp();
  };
}


function showTopicMenu(subject, topic) {

  openModal(`
    <h2>${escapeHTML(topic.name)}</h2>

    <div class="modal-actions"
      style="justify-content:flex-start; flex-wrap:wrap;">

      <button id="renameTopic" class="secondary-btn">
        Rename
      </button>

      <button id="deleteTopic" class="danger-btn">
        Delete
      </button>

      <button id="cancelTopicMenu" class="secondary-btn">
        Cancel
      </button>
    </div>
  `);

  document.getElementById("renameTopic").onclick = () => {
    openTopicModal(subject.id, topic);
  };

  document.getElementById("cancelTopicMenu").onclick = closeModal;

  document.getElementById("deleteTopic").onclick = () => {
    confirmDelete(
      `Delete ${topic.name}?`,
      "This will permanently delete all notes, homework, tests and study sessions inside this topic.",
      () => {
        subject.topics =
          subject.topics.filter(
            item => item.id !== topic.id
          );

        if (state.selectedTopicId === topic.id) {
          state.selectedTopicId =
            subject.topics[0]?.id || null;
        }

        saveCurrentUser();
        closeModal();
        renderApp();
      }
    );
  };
}


/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {

    state.selectedSection = button.dataset.section;
    state.currentNoteId = null;

    document.querySelectorAll(".nav-item").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");

    renderContent();
  });
});


function renderContent() {

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.section === state.selectedSection
    );
  });

  const content = document.getElementById("content");

  if (state.selectedSection !== "calendar" && !getSelectedTopic()) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-inner">
          <h2>Choose a subject and topic</h2>
          <p>
            Create a subject, then add a topic to start.
          </p>
        </div>
      </div>
    `;

    return;
  }

  switch (state.selectedSection) {
    case "notes":
      renderNotes();
      break;

    case "homework":
      renderHomework();
      break;

    case "studyplan":
      renderStudyPlan();
      break;

    case "calendar":
      renderCalendar();
      break;

    case "tests":
      renderTests();
      break;
  }
}


/* =========================
   NOTES
========================= */

function renderNotes() {

  const topic = getSelectedTopic();
  const content = document.getElementById("content");

  if (state.currentNoteId) {
    renderNoteEditor(topic);
    return;
  }

  if (!topic.notes.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-inner">
          <h2>No notes yet</h2>
          <p>
            Start building your notes for
            ${escapeHTML(topic.name)}.
          </p>

          <button id="createFirstNote" class="primary-btn">
            + Create Note
          </button>
        </div>
      </div>
    `;

    document.getElementById("createFirstNote").onclick =
      createNote;

    return;
  }

  content.innerHTML = `
    <div class="section-header">
      <h2>Notes</h2>

      <button id="createNoteBtn" class="primary-btn">
        + Create Note
      </button>
    </div>

    <div class="note-grid">
      ${topic.notes.map(note => `
        <article class="note-card" data-note-id="${note.id}">
          <h3>${escapeHTML(note.title || "Untitled Note")}</h3>

          <p>
            ${escapeHTML(
              stripHTML(note.content).substring(0, 180)
            ) || "Empty note"}
          </p>
        </article>
      `).join("")}
    </div>
  `;

  document.getElementById("createNoteBtn").onclick =
    createNote;

  content.querySelectorAll(".note-card").forEach(card => {
    card.onclick = () => {
      state.currentNoteId = card.dataset.noteId;
      renderNotes();
    };
  });
}


function createNote() {
  const topic = getSelectedTopic();

  const note = {
    id: uid(),
    title: "Untitled Note",
    content: ""
  };

  topic.notes.push(note);

  state.currentNoteId = note.id;

  saveCurrentUser();
  renderNotes();
}


function renderNoteEditor(topic) {

  const note =
    topic.notes.find(
      note => note.id === state.currentNoteId
    );

  if (!note) {
    state.currentNoteId = null;
    renderNotes();
    return;
  }

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="note-editor-header">

      <button id="backToNotes" class="back-btn">
        â Back
      </button>

      <input
        id="noteTitle"
        class="note-title-input"
        value="${escapeHTML(note.title)}"
      />
    </div>

    <div class="format-bar">
      <button data-command="bold"><b>B</b></button>
      <button data-command="italic"><i>I</i></button>
      <button data-command="insertUnorderedList">â¢ List</button>
      <button data-command="insertOrderedList">1. List</button>
    </div>

    <div class="editor-wrap">
      <div id="lineNumbers" class="line-numbers"></div>

      <div
        id="noteEditor"
        class="note-editor"
        contenteditable="true"
      >${note.content}</div>
    </div>
  `;

  const title = document.getElementById("noteTitle");
  const editor = document.getElementById("noteEditor");

  function updateLines() {
    const lines =
      Math.max(
        1,
        editor.innerText.split("\n").length
      );

    document.getElementById("lineNumbers").innerHTML =
      Array.from(
        { length: lines },
        (_, index) => `<div>${index + 1}</div>`
      ).join("");
  }

  updateLines();

  document.getElementById("backToNotes").onclick = () => {
    state.currentNoteId = null;
    renderNotes();
  };

  title.addEventListener("input", () => {
    note.title = title.value;
    saveCurrentUser();
  });

  editor.addEventListener("input", () => {
    note.content = editor.innerHTML;
    updateLines();
    saveCurrentUser();
  });

  document.querySelectorAll(".format-bar button").forEach(button => {
    button.onclick = () => {
      document.execCommand(
        button.dataset.command,
        false,
        null
      );

      editor.focus();
      note.content = editor.innerHTML;
      saveCurrentUser();
      updateLines();
    };
  });
}


/* =========================
   HOMEWORK
========================= */

function renderHomework() {

  const topic = getSelectedTopic();
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="section-header">
      <h2>Homework</h2>

      <button id="addHomeworkBtn" class="primary-btn">
        + Add Homework
      </button>
    </div>

    ${
      topic.homework.length
        ? `
          <div class="card-grid">
            ${topic.homework.map(item => `
              <div class="data-card ${
                item.completed ? "completed" : ""
              }">

                <div class="card-top">
                  <div>
                    <h3>${escapeHTML(item.title)}</h3>
                    <p>${escapeHTML(item.description)}</p>
                  </div>

                  <button
                    class="small-btn complete-btn ${
                      item.completed ? "done" : ""
                    }"
                    data-complete="${item.id}"
                  >
                    ${item.completed ? "â Done" : "Complete"}
                  </button>
                </div>

                <div class="card-meta">
                  <span class="meta">
                    ð ${item.dueDate || "No date"}
                  </span>

                  <span class="meta">
                    â±ï¸ ${item.duration || "No estimate"}
                  </span>

                  <span class="meta">
                    ð© ${item.priority}
                  </span>
                </div>

                <div class="card-actions">
                  <button
                    class="small-btn"
                    data-edit-homework="${item.id}"
                  >
                    Edit
                  </button>

                  <button
                    class="small-btn"
                    data-delete-homework="${item.id}"
                  >
                    Delete
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            <div class="empty-state-inner">
              <h2>No homework</h2>
              <p>
                Add homework for ${escapeHTML(topic.name)}.
              </p>
            </div>
          </div>
        `
    }
  `;

  document.getElementById("addHomeworkBtn").onclick =
    () => openHomeworkModal();

  content.querySelectorAll("[data-complete]").forEach(button => {
    button.onclick = () => {
      const item = topic.homework.find(
        item => item.id === button.dataset.complete
      );

      item.completed = !item.completed;

      saveCurrentUser();
      renderHomework();
    };
  });

  content.querySelectorAll("[data-edit-homework]").forEach(button => {
    button.onclick = () => {
      const item = topic.homework.find(
        item => item.id === button.dataset.editHomework
      );

      openHomeworkModal(item);
    };
  });

  content.querySelectorAll("[data-delete-homework]").forEach(button => {
    button.onclick = () => {
      topic.homework =
        topic.homework.filter(
          item => item.id !== button.dataset.deleteHomework
        );

      saveCurrentUser();
      renderHomework();
    };
  });
}


function openHomeworkModal(existing = null) {

  openModal(`
    <h2>
      ${existing ? "Edit Homework" : "Add Homework"}
    </h2>

    <form id="homeworkForm" class="modal-form">

      <label>
        Title
        <input
          id="hwTitle"
          required
          value="${existing ? escapeHTML(existing.title) : ""}"
        />
      </label>

      <label>
        Description
        <textarea id="hwDescription">${
          existing ? escapeHTML(existing.description) : ""
        }</textarea>
      </label>

      <label>
        Due Date
        <input
          id="hwDate"
          type="date"
          value="${existing?.dueDate || ""}"
        />
      </label>

      <label>
        Estimated Time
        <input
          id="hwDuration"
          placeholder="45 minutes"
          value="${existing?.duration || ""}"
        />
      </label>

      <label>
        Priority
        <select id="hwPriority">
          ${["Low", "Medium", "High"].map(priority => `
            <option ${
              existing?.priority === priority
                ? "selected"
                : ""
            }>
              ${priority}
            </option>
          `).join("")}
        </select>
      </label>

      <div class="modal-actions">
        <button type="button" id="cancelModal" class="secondary-btn">
          Cancel
        </button>

        <button type="submit" class="primary-btn">
          Save
        </button>
      </div>

    </form>
  `);

  document.getElementById("cancelModal").onclick = closeModal;

  document.getElementById("homeworkForm").onsubmit = event => {
    event.preventDefault();

    const topic = getSelectedTopic();

    const data = {
      title: document.getElementById("hwTitle").value.trim(),
      description: document.getElementById("hwDescription").value.trim(),
      dueDate: document.getElementById("hwDate").value,
      duration: document.getElementById("hwDuration").value.trim(),
      priority: document.getElementById("hwPriority").value,
      completed: existing?.completed || false
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      topic.homework.push({
        id: uid(),
        ...data
      });
    }

    saveCurrentUser();
    closeModal();
    renderHomework();
  };
}


/* =========================
   TESTS
========================= */

function daysUntil(dateString) {

  if (!dateString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateString + "T00:00:00");

  return Math.ceil(
    (date - today) / 86400000
  );
}


function renderTests() {

  const topic = getSelectedTopic();
  const content = document.getElementById("content");

  const tests =
    [...topic.tests].sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date)
    );

  content.innerHTML = `
    <div class="section-header">
      <h2>Tests</h2>

      <button id="addTestBtn" class="primary-btn">
        + Add Test
      </button>
    </div>

    ${
      tests.length
        ? `
          <div class="card-grid">
            ${tests.map(test => {

              const days = daysUntil(test.date);

              return `
                <div class="data-card">

                  <h3>
                    ${escapeHTML(test.name)}
                  </h3>

                  <div class="countdown">
                    ${
                      days === 0
                        ? "TODAY"
                        : days < 0
                          ? "PASSED"
                          : `${days} DAYS LEFT`
                    }
                  </div>

                  <div class="card-meta">
                    <span class="meta">
                      ð ${test.date}
                    </span>

                    ${
                      test.time
                        ? `
                          <span class="meta">
                            ð ${test.time}
                          </span>
                        `
                        : ""
                    }

                    <span class="meta">
                      ð© ${test.priority}
                    </span>
                  </div>

                  <p style="margin-top:14px">
                    ${escapeHTML(test.notes || "No extra notes")}
                  </p>

                  <div class="progress-wrap">
                    <div class="progress-label">
                      <span>Prepared</span>
                      <span>${test.prepared}%</span>
                    </div>

                    <div class="progress">
                      <div style="width:${test.prepared}%"></div>
                    </div>
                  </div>

                  <div class="card-actions">
                    <button
                      class="small-btn"
                      data-edit-test="${test.id}"
                    >
                      Edit
                    </button>

                    <button
                      class="small-btn"
                      data-delete-test="${test.id}"
                    >
                      Delete
                    </button>
                  </div>

                </div>
              `;
            }).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            <div class="empty-state-inner">
              <h2>No upcoming tests</h2>
              <p>
                Add a test for ${escapeHTML(topic.name)}.
              </p>
            </div>
          </div>
        `
    }
  `;

  document.getElementById("addTestBtn").onclick =
    () => openTestModal();

  content.querySelectorAll("[data-edit-test]").forEach(button => {
    button.onclick = () => {
      const test = topic.tests.find(
        test => test.id === button.dataset.editTest
      );

      openTestModal(test);
    };
  });

  content.querySelectorAll("[data-delete-test]").forEach(button => {
    button.onclick = () => {
      topic.tests =
        topic.tests.filter(
          test => test.id !== button.dataset.deleteTest
        );

      saveCurrentUser();
      renderTests();
    };
  });
}


function openTestModal(existing = null) {

  openModal(`
    <h2>${existing ? "Edit Test" : "Add Test"}</h2>

    <form id="testForm" class="modal-form">

      <label>
        Test Name
        <input
          id="testName"
          required
          value="${existing ? escapeHTML(existing.name) : ""}"
        />
      </label>

      <label>
        Date
        <input
          id="testDate"
          type="date"
          required
          value="${existing?.date || ""}"
        />
      </label>

      <label>
        Time (optional)
        <input
          id="testTime"
          type="time"
          value="${existing?.time || ""}"
        />
      </label>

      <label>
        Priority
        <select id="testPriority">
          ${["Low", "Medium", "High"].map(priority => `
            <option ${
              existing?.priority === priority
                ? "selected"
                : ""
            }>
              ${priority}
            </option>
          `).join("")}
        </select>
      </label>

      <label>
        How prepared are you? (${existing?.prepared ?? 0}%)
        <input
          id="testPrepared"
          type="range"
          min="0"
          max="100"
          value="${existing?.prepared ?? 0}"
        />
      </label>

      <label>
        Extra Notes
        <textarea id="testNotes">${
          existing ? escapeHTML(existing.notes) : ""
        }</textarea>
      </label>

      <div class="modal-actions">
        <button type="button" id="cancelModal" class="secondary-btn">
          Cancel
        </button>

        <button type="submit" class="primary-btn">
          Save
        </button>
      </div>

    </form>
  `);

  document.getElementById("cancelModal").onclick = closeModal;

  document.getElementById("testForm").onsubmit = event => {
    event.preventDefault();

    const topic = getSelectedTopic();

    const data = {
      name: document.getElementById("testName").value.trim(),
      date: document.getElementById("testDate").value,
      time: document.getElementById("testTime").value,
      priority: document.getElementById("testPriority").value,
      prepared: Number(
        document.getElementById("testPrepared").value
      ),
      notes:
        document.getElementById("testNotes").value.trim()
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      topic.tests.push({
        id: uid(),
        ...data
      });
    }

    saveCurrentUser();
    closeModal();
    renderTests();
  };
}


/* =========================
   STUDY PLAN
========================= */

function renderStudyPlan() {

  const topic = getSelectedTopic();
  const content = document.getElementById("content");

  const sessions =
    [...topic.studySessions].sort(
      (a, b) =>
        new Date(`${a.date}T${a.startTime}`) -
        new Date(`${b.date}T${b.startTime}`)
    );

  content.innerHTML = `
    <div class="section-header">
      <h2>Study Plan</h2>

      <button id="addStudyBtn" class="primary-btn">
        + Add Study Session
      </button>
    </div>

    ${
      sessions.length
        ? `
          <div class="study-plan-list">
            ${sessions.map(session => `
              <div class="study-session">

                <div class="study-time">
                  ${session.date}<br />
                  ${session.startTime} â ${session.endTime}
                </div>

                <div class="study-info">
                  <strong>
                    ${escapeHTML(session.title)}
                  </strong>

                  <span>
                    ${escapeHTML(session.description || "Study session")}
                  </span>
                </div>

                <button
                  class="small-btn"
                  data-edit-study="${session.id}"
                >
                  Edit
                </button>

                <button
                  class="small-btn"
                  data-delete-study="${session.id}"
                >
                  Delete
                </button>

              </div>
            `).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            <div class="empty-state-inner">
              <h2>No study sessions yet</h2>
              <p>
                Add your study sessions manually.
              </p>
            </div>
          </div>
        `
    }
  `;

  document.getElementById("addStudyBtn").onclick =
    () => openStudyModal();

  content.querySelectorAll("[data-edit-study]").forEach(button => {
    button.onclick = () => {
      const session = topic.studySessions.find(
        session => session.id === button.dataset.editStudy
      );

      openStudyModal(session);
    };
  });

  content.querySelectorAll("[data-delete-study]").forEach(button => {
    button.onclick = () => {
      topic.studySessions =
        topic.studySessions.filter(
          session => session.id !== button.dataset.deleteStudy
        );

      saveCurrentUser();
      renderStudyPlan();
    };
  });
}


function openStudyModal(existing = null) {

  openModal(`
    <h2>
      ${existing ? "Edit Study Session" : "Add Study Session"}
    </h2>

    <form id="studyForm" class="modal-form">

      <label>
        Title
        <input
          id="studyTitle"
          required
          value="${existing ? escapeHTML(existing.title) : "Study"}"
        />
      </label>

      <label>
        Description
        <textarea id="studyDescription">${
          existing ? escapeHTML(existing.description) : ""
        }</textarea>
      </label>

      <label>
        Date
        <input
          id="studyDate"
          type="date"
          required
          value="${existing?.date || ""}"
        />
      </label>

      <label>
        Start Time
        <input
          id="studyStart"
          type="time"
          required
          value="${existing?.startTime || "16:00"}"
        />
      </label>

      <label>
        End Time
        <input
          id="studyEnd"
          type="time"
          required
          value="${existing?.endTime || "17:00"}"
        />
      </label>

      <div class="modal-actions">
        <button type="button" id="cancelModal" class="secondary-btn">
          Cancel
        </button>

        <button type="submit" class="primary-btn">
          Save
        </button>
      </div>

    </form>
  `);

  document.getElementById("cancelModal").onclick = closeModal;

  document.getElementById("studyForm").onsubmit = event => {
    event.preventDefault();

    const topic = getSelectedTopic();

    const data = {
      title: document.getElementById("studyTitle").value.trim(),
      description:
        document.getElementById("studyDescription").value.trim(),
      date: document.getElementById("studyDate").value,
      startTime: document.getElementById("studyStart").value,
      endTime: document.getElementById("studyEnd").value
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      topic.studySessions.push({
        id: uid(),
        ...data
      });
    }

    saveCurrentUser();
    closeModal();
    renderStudyPlan();
  };
}


/* =========================
   CALENDAR
========================= */

function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();

  const diff =
    result.getDate() -
    day +
    (day === 0 ? -6 : 1);

  result.setDate(diff);
  result.setHours(0, 0, 0, 0);

  return result;
}


function formatDateLocal(date) {
  const year = date.getFullYear();
  const month =
    String(date.getMonth() + 1).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getWeekDates() {
  const today = new Date();

  today.setDate(
    today.getDate() + state.weekOffset * 7
  );

  const monday = getMonday(today);

  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    }
  );
}


function renderCalendar() {

  const content = document.getElementById("content");

  const dates = getWeekDates();

  const dayNames =
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const start = dates[0];
  const end = dates[6];

  content.innerHTML = `
    <div class="section-header">
      <h2>Calendar</h2>

      <button id="addCalendarEvent" class="primary-btn">
        + Add Event
      </button>
    </div>

    <div class="calendar-toolbar">

      <button id="prevWeek" class="calendar-nav-btn">
        â
      </button>

      <button id="todayWeek" class="secondary-btn">
        Today
      </button>

      <div class="calendar-title">
        ${start.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        })}
        â
        ${end.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric"
        })}
      </div>

      <button id="nextWeek" class="calendar-nav-btn">
        â
      </button>
    </div>

    <div class="calendar-scroll">
      <div class="calendar">

        <div class="calendar-head">
          <div></div>

          ${dates.map((date, index) => `
            <div>
              ${dayNames[index]}<br />
              <strong>${date.getDate()}</strong>
            </div>
          `).join("")}
        </div>

        <div class="calendar-body">

          <div class="time-column">
            ${Array.from(
              { length: 12 },
              (_, index) =>
                `<div class="hour">${String(index + 8).padStart(2, "0")}:00</div>`
            ).join("")}
          </div>

          ${dates.map(date => `
            <div
              class="day-column"
              data-date="${formatDateLocal(date)}"
            ></div>
          `).join("")}

        </div>

      </div>
    </div>
  `;

  renderCalendarEvents(dates);

  document.getElementById("prevWeek").onclick = () => {
    state.weekOffset--;
    renderCalendar();
  };

  document.getElementById("nextWeek").onclick = () => {
    state.weekOffset++;
    renderCalendar();
  };

  document.getElementById("todayWeek").onclick = () => {
    state.weekOffset = 0;
    renderCalendar();
  };

  document.getElementById("addCalendarEvent").onclick =
    () => openCalendarModal();
}


function allStudySessions() {

  const events = [];

  currentUser.subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      topic.studySessions.forEach(session => {
        events.push({
          ...session,
          subjectId: subject.id,
          topicId: topic.id,
          type: "study",
          color: subject.color
        });
      });
    });
  });

  return events;
}


function getEventsForDate(date) {

  const dateString = formatDateLocal(date);

  const manualEvents =
    currentUser.calendarEvents.filter(event => {

      if (event.recurring) {
        return Number(event.dayOfWeek) ===
          (date.getDay() + 6) % 7;
      }

      return event.date === dateString;
    });

  const studyEvents =
    allStudySessions().filter(
      event => event.date === dateString
    );

  return [...manualEvents, ...studyEvents];
}


function timeToMinutes(time) {
  const [hours, minutes] =
    time.split(":").map(Number);

  return hours * 60 + minutes;
}


function renderCalendarEvents(dates) {

  dates.forEach(date => {

    const column =
      document.querySelector(
        `.day-column[data-date="${formatDateLocal(date)}"]`
      );

    const events = getEventsForDate(date);

    events.forEach(event => {

      const start =
        timeToMinutes(event.startTime || "08:00");

      const end =
        timeToMinutes(event.endTime || "09:00");

      const calendarStart = 8 * 60;

      const top =
        Math.max(0, start - calendarStart);

      const height =
        Math.max(30, end - start);

      const div = document.createElement("div");

      div.className = "calendar-event";

      div.style.top = `${top}px`;
      div.style.height = `${height}px`;
      div.style.background =
        event.color || "#596273";

      div.innerHTML = `
        <strong>${escapeHTML(event.title)}</strong>
        <span>
          ${event.startTime || ""}
          â
          ${event.endTime || ""}
        </span>
      `;

      div.onclick = () => {
        if (event.type === "study") {

          const subject =
            currentUser.subjects.find(
              subject => subject.id === event.subjectId
            );

          const topic =
            subject?.topics.find(
              topic => topic.id === event.topicId
            );

          if (topic) {
            state.selectedSubjectId = subject.id;
            state.selectedTopicId = topic.id;
            state.selectedSection = "studyplan";
            renderApp();
          }

        } else {
          openCalendarModal(event);
        }
      };

      column.appendChild(div);
    });
  });
}


function openCalendarModal(existing = null) {

  openModal(`
    <h2>
      ${existing ? "Edit Event" : "Add Event"}
    </h2>

    <form id="calendarForm" class="modal-form">

      <label>
        Title
        <input
          id="eventTitle"
          required
          value="${existing ? escapeHTML(existing.title) : ""}"
        />
      </label>

      <label>
        Date
        <input
          id="eventDate"
          type="date"
          value="${existing?.date || formatDateLocal(new Date())}"
        />
      </label>

      <label>
        Start Time
        <input
          id="eventStart"
          type="time"
          value="${existing?.startTime || "08:00"}"
        />
      </label>

      <label>
        End Time
        <input
          id="eventEnd"
          type="time"
          value="${existing?.endTime || "09:00"}"
        />
      </label>

      <label>
        Color
        <input
          id="eventColor"
          type="color"
          value="${existing?.color || "#596273"}"
        />
      </label>

      <label style="display:flex; align-items:center; gap:8px;">
        <input
          id="eventRecurring"
          type="checkbox"
          ${existing?.recurring ? "checked" : ""}
        />

        Repeat every week
      </label>

      <div class="modal-actions">

        ${
          existing
            ? `
              <button
                type="button"
                id="deleteCalendarEvent"
                class="danger-btn"
              >
                Delete
              </button>
            `
            : ""
        }

        <button type="button" id="cancelModal" class="secondary-btn">
          Cancel
        </button>

        <button type="submit" class="primary-btn">
          Save
        </button>

      </div>

    </form>
  `);

  document.getElementById("cancelModal").onclick =
    closeModal;

  if (existing) {
    document.getElementById("deleteCalendarEvent").onclick = () => {
      currentUser.calendarEvents =
        currentUser.calendarEvents.filter(
          event => event.id !== existing.id
        );

      saveCurrentUser();
      closeModal();
      renderCalendar();
    };
  }

  document.getElementById("calendarForm").onsubmit = event => {
    event.preventDefault();

    const date =
      document.getElementById("eventDate").value;

    const recurring =
      document.getElementById("eventRecurring").checked;

    const chosenDate =
      new Date(date + "T12:00:00");

    const data = {
      title:
        document.getElementById("eventTitle").value.trim(),

      date,

      startTime:
        document.getElementById("eventStart").value,

      endTime:
        document.getElementById("eventEnd").value,

      color:
        document.getElementById("eventColor").value,

      recurring,

      dayOfWeek:
        (chosenDate.getDay() + 6) % 7
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      currentUser.calendarEvents.push({
        id: uid(),
        ...data
      });
    }

    saveCurrentUser();
    closeModal();
    renderCalendar();
  };
}


/* =========================
   SETTINGS
========================= */

document.getElementById("settingsBtn").onclick = () => {

  openModal(`
    <h2>Settings</h2>

    <form id="settingsForm" class="modal-form">

      <label>
        Your Name
        <input
          id="settingsName"
          value="${escapeHTML(currentUser.name)}"
        />
      </label>

      <label>
        Grade
        <input
          id="settingsGrade"
          value="${escapeHTML(currentUser.grade)}"
        />
      </label>

      <div class="modal-actions">

        <button type="button" id="cancelModal" class="secondary-btn">
          Cancel
        </button>

        <button type="submit" class="primary-btn">
          Save
        </button>

      </div>

    </form>
  `);

  document.getElementById("cancelModal").onclick =
    closeModal;

  document.getElementById("settingsForm").onsubmit = event => {
    event.preventDefault();

    currentUser.name =
      document.getElementById("settingsName").value.trim();

    currentUser.grade =
      document.getElementById("settingsGrade").value.trim();

    saveCurrentUser();
    closeModal();
    renderProfile();
    renderSidebar();
  };
};


/* =========================
   STUDYPAD AI
========================= */

const aiPanel =
  document.getElementById("aiPanel");

const aiMessages =
  document.getElementById("aiMessages");

const aiInput =
  document.getElementById("aiInput");

const sendAiBtn =
  document.getElementById("sendAiBtn");


document.getElementById("toggleAiBtn").onclick = () => {

  aiPanel.classList.toggle("hidden");

  if (!aiPanel.classList.contains("hidden")) {
    setTimeout(() => aiInput.focus(), 100);
  }

};


document.getElementById("closeAiBtn").onclick = () => {

  aiPanel.classList.add("hidden");

};


/* =========================
   ADD MESSAGE
========================= */

function addAiMessage(text, role = "assistant") {

  const welcome =
    aiMessages.querySelector(".ai-welcome");

  if (welcome) {
    welcome.remove();
  }

  const message =
    document.createElement("div");

  message.className =
    `ai-message ${role}`;

  const bubble =
    document.createElement("div");

  bubble.className =
    "ai-bubble";

  bubble.textContent = text;

  message.appendChild(bubble);

  aiMessages.appendChild(message);

  aiMessages.scrollTop =
    aiMessages.scrollHeight;

  return message;
}


/* =========================
   THINKING ANIMATION
========================= */

function showAiThinking() {

  const thinking =
    document.createElement("div");

  thinking.className =
    "ai-message assistant";

  thinking.id =
    "aiThinking";

  thinking.innerHTML = `
    <div class="ai-bubble ai-thinking">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  aiMessages.appendChild(thinking);

  aiMessages.scrollTop =
    aiMessages.scrollHeight;
}


function removeAiThinking() {

  const thinking =
    document.getElementById("aiThinking");

  if (thinking) {
    thinking.remove();
  }

}


/* =========================
   SEND MESSAGE
========================= */

async function sendAiMessage(customMessage = null) {

  const message =
    customMessage ||
    aiInput.value.trim();

  if (!message) return;


  addAiMessage(message, "user");

  aiInput.value = "";
  aiInput.style.height = "auto";

  sendAiBtn.disabled = true;

  showAiThinking();


  try {

    const {
      data,
      error
    } = await db.functions.invoke(
      "study-pad",
      {
        body: {
          message
        }
      }
    );


    removeAiThinking();


    if (error) {
      console.error(
        "StudyPad AI error:",
        error
      );

      addAiMessage(
        "Sorry, I couldn't reach StudyPad AI. Please try again.",
        "assistant"
      );

      return;
    }


    if (data?.error) {

      console.error(
        "StudyPad AI error:",
        data.error
      );

      addAiMessage(
        `Error: ${data.error}`,
        "assistant"
      );

      return;
    }


    addAiMessage(
      data?.answer ||
      "Sorry, I didn't get a response.",
      "assistant"
    );


  } catch (error) {

    console.error(
      "StudyPad AI unexpected error:",
      error
    );

    removeAiThinking();

    addAiMessage(
      "Something went wrong while talking to StudyPad AI.",
      "assistant"
    );

  } finally {

    sendAiBtn.disabled = false;

    aiInput.focus();

  }

}


/* =========================
   SEND BUTTON
========================= */

sendAiBtn.onclick = () => {

  sendAiMessage();

};


/* =========================
   ENTER TO SEND
========================= */

aiInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendAiMessage();

    }

  }
);


/* =========================
   AUTO RESIZE INPUT
========================= */

aiInput.addEventListener(
  "input",
  () => {

    aiInput.style.height = "auto";

    aiInput.style.height =
      Math.min(
        aiInput.scrollHeight,
        130
      ) + "px";

  }
);


/* =========================
   SUGGESTION BUTTONS
========================= */

document
  .querySelectorAll(".ai-suggestion")
  .forEach(button => {

    button.onclick = () => {

      const suggestion =
        button.textContent.trim();

      sendAiMessage(suggestion);

    };

  });

/* =========================
   MODALS
========================= */

function openModal(html) {
  document.getElementById("modal").innerHTML = html;
  document
    .getElementById("modalOverlay")
    .classList.remove("hidden");
}


function closeModal() {
  document
    .getElementById("modalOverlay")
    .classList.add("hidden");
}


document
  .getElementById("modalOverlay")
  .addEventListener("click", event => {

    if (event.target.id === "modalOverlay") {
      closeModal();
    }
  });


function confirmDelete(title, description, callback) {

  openModal(`
    <h2>${escapeHTML(title)}</h2>

    <p style="color:var(--muted); line-height:1.5">
      ${escapeHTML(description)}
    </p>

    <div class="modal-actions">

      <button id="cancelDelete" class="secondary-btn">
        Cancel
      </button>

      <button id="confirmDelete" class="danger-btn">
        Delete
      </button>

    </div>
  `);

  document.getElementById("cancelDelete").onclick =
    closeModal;

  document.getElementById("confirmDelete").onclick =
    callback;
}


/* =========================
   DRAG + DROP ORDER
========================= */

function enableSidebarDragDrop() {

  let draggedSubject = null;
  let draggedTopic = null;

  document.querySelectorAll(".subject-row").forEach(row => {

    row.addEventListener("dragstart", () => {
      draggedSubject =
        row.closest(".subject").dataset.subjectId;
    });

    row.addEventListener("dragover", event => {
      event.preventDefault();
    });

    row.addEventListener("drop", () => {

      const target =
        row.closest(".subject").dataset.subjectId;

      if (!draggedSubject || draggedSubject === target) return;

      const from =
        currentUser.subjects.findIndex(
          subject => subject.id === draggedSubject
        );

      const to =
        currentUser.subjects.findIndex(
          subject => subject.id === target
        );

      const [item] =
        currentUser.subjects.splice(from, 1);

      currentUser.subjects.splice(to, 0, item);

      saveCurrentUser();
      renderSidebar();
    });
  });


  document.querySelectorAll(".topic-row").forEach(row => {

    row.addEventListener("dragstart", () => {
      draggedTopic = row.dataset.topicId;
    });

    row.addEventListener("dragover", event => {
      event.preventDefault();
    });

    row.addEventListener("drop", () => {

      const target = row.dataset.topicId;

      const subject = getSelectedSubject();

      if (!draggedTopic || draggedTopic === target) return;

      const from =
        subject.topics.findIndex(
          topic => topic.id === draggedTopic
        );

      const to =
        subject.topics.findIndex(
          topic => topic.id === target
        );

      const [item] =
        subject.topics.splice(from, 1);

      subject.topics.splice(to, 0, item);

      saveCurrentUser();
      renderSidebar();
    });
  });
}


/* =========================
   STARTUP
========================= */

(async function startup() {

  const {
    data: { session }
  } = await db.auth.getSession();

  if (!session?.user) return;

  const authUser = session.user;

  let user =
    users.find(item => item.id === authUser.id);

  if (!user) {
    user = {
      id: authUser.id,
      name:
        authUser.user_metadata?.name ||
        "StudyPad User",
      grade:
        authUser.user_metadata?.grade ||
        "",
      username:
        authUser.user_metadata?.username ||
        "",
      subjects: [],
      calendarEvents: []
    };

    users.push(user);
    saveUsers();
  }

  currentUser = user;

  localStorage.setItem(
    SESSION_KEY,
    authUser.id
  );

  openApp();
})();
