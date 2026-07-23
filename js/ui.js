function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTaskProgress(tasks) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const doneCount = safeTasks.filter((task) => task.done).length;

  return {
    done: doneCount,
    total: safeTasks.length,
  };
}

function renderTaskChecklistHtml(memo) {
  const tasks = Array.isArray(memo.tasks) ? memo.tasks : [];

  if (tasks.length === 0) {
    return "";
  }

  const progress = getTaskProgress(tasks);

  return `
    <section class="detail-checklist">
      <div class="detail-checklist-header">
        <strong>체크리스트</strong>
        <span>${progress.done}/${progress.total} 완료</span>
      </div>

      <ul class="detail-task-list">
        ${tasks
          .map(
            (task) => `
              <li class="detail-task-item ${task.done ? "done" : ""}">
                <button
                  type="button"
                  class="task-toggle-button"
                  data-memo-id="${escapeHtml(memo.id)}"
                  data-task-id="${escapeHtml(task.id)}"
                  aria-label="${task.done ? "미완료로 변경" : "완료 처리"}: ${escapeHtml(task.text)}"
                  aria-pressed="${task.done ? "true" : "false"}"
                >
                  <span class="task-checkmark" aria-hidden="true">${task.done ? "✓" : ""}</span>
                </button>
                <span class="task-text">${escapeHtml(task.text)}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}


function renderTaskHub(items, view = "open") {
  const taskHubList = document.querySelector("#taskHubList");

  if (!taskHubList) {
    return;
  }

  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    const title =
      view === "open"
        ? "남아 있는 할 일이 없습니다."
        : "등록된 체크리스트가 없습니다.";
    const description =
      view === "open"
        ? "모든 할 일을 완료했거나 아직 체크리스트가 없습니다."
        : "메모 작성 화면에서 체크리스트를 추가해보세요.";

    taskHubList.innerHTML = `
      <div class="task-hub-empty">
        <strong>${title}</strong>
        <p>${description}</p>
      </div>
    `;
    return;
  }

  taskHubList.innerHTML = safeItems
    .map((item) => {
      const task = item.task;
      const safeTaskText = escapeHtml(task.text);
      const safeMemoTitle = escapeHtml(item.memoTitle);
      const safeCategory = escapeHtml(item.category);
      const date = formatDate(item.updatedAt || item.createdAt);
      const metaParts = [
        safeMemoTitle,
        safeCategory,
        date,
      ].filter(Boolean);

      return `
        <article class="task-hub-item ${task.done ? "done" : ""}">
          <button
            type="button"
            class="task-hub-check-button"
            data-task-action="toggle"
            data-memo-id="${escapeHtml(item.memoId)}"
            data-task-id="${escapeHtml(task.id)}"
            aria-label="${task.done ? "할 일 미완료로 변경" : "할 일 완료 처리"}: ${safeTaskText}"
            aria-pressed="${task.done ? "true" : "false"}"
          >
            <span class="task-hub-checkmark" aria-hidden="true">${task.done ? "✓" : ""}</span>
          </button>

          <button
            type="button"
            class="task-hub-main-link"
            data-task-action="open-memo"
            data-memo-id="${escapeHtml(item.memoId)}"
            aria-label="원본 메모 열기: ${safeMemoTitle}"
          >
            <span class="task-hub-task-text">${safeTaskText}</span>
            <span class="task-hub-source">${metaParts.join(" · ")}</span>
            <span class="task-hub-arrow" aria-hidden="true">›</span>
          </button>
        </article>
      `;
    })
    .join("");
}

function renderMemoList(memos) {
  const memoList = document.querySelector("#memoList");

  if (memos.length === 0) {
    memoList.innerHTML = `
      <div class="empty-state">
        <strong>표시할 메모가 없습니다.</strong>
        <p>새 메모를 작성하거나 검색어·카테고리를 확인해보세요.</p>
        <div class="empty-state-actions">
          <button type="button" class="primary-button compact-button" data-empty-action="create">
            새 메모 작성
          </button>
        </div>
      </div>
    `;
    return;
  }

  memoList.innerHTML = memos
    .map((memo) => {
      const safeTitle = escapeHtml(memo.title);
      const safeContent = escapeHtml(memo.content);
      const safeCategory = memo.isDeleted ? "휴지통" : escapeHtml(memo.category);
      const date = formatDate(memo.updatedAt || memo.createdAt);
      const importantMark = memo.isImportant ? '<span class="star-mark" aria-label="중요 메모">★</span>' : "";
      const progress = getTaskProgress(memo.tasks);
      const taskChip =
        progress.total > 0
          ? `<span class="task-progress-chip">체크 ${progress.done}/${progress.total}</span>`
          : "";

      return `
        <button type="button" class="memo-card" data-id="${escapeHtml(memo.id)}">
          <div class="memo-card-top">
            <div class="memo-card-badges">
              <span class="category-chip">${safeCategory}</span>
              ${memo.isImportant ? '<span class="important-chip">중요</span>' : ""}
              ${taskChip}
            </div>
            <span class="memo-date">${date}</span>
          </div>
          <h3>${importantMark}${safeTitle}</h3>
          <p>${safeContent}</p>
        </button>
      `;
    })
    .join("");
}


function renderTrashList(memos) {
  const trashList = document.querySelector("#trashList");

  if (!trashList) {
    return;
  }

  if (!Array.isArray(memos) || memos.length === 0) {
    trashList.innerHTML = `
      <div class="empty-state trash-empty-state">
        <strong>휴지통이 비어 있습니다.</strong>
        <p>삭제한 메모가 생기면 이 화면에서 복원하거나 영구 삭제할 수 있습니다.</p>
      </div>
    `;
    return;
  }

  trashList.innerHTML = memos
    .map((memo) => {
      const safeTitle = escapeHtml(memo.title);
      const safeContent = escapeHtml(memo.content);
      const safeCategory = escapeHtml(memo.category || "업무");
      const date = formatDate(memo.updatedAt || memo.createdAt);
      const progress = getTaskProgress(memo.tasks);
      const taskChip =
        progress.total > 0
          ? `<span class="task-progress-chip">체크 ${progress.done}/${progress.total}</span>`
          : "";

      return `
        <article class="trash-card" data-id="${escapeHtml(memo.id)}">
          <button
            type="button"
            class="trash-card-main"
            data-trash-open="${escapeHtml(memo.id)}"
            aria-label="${safeTitle} 상세 보기"
          >
            <div class="trash-card-top">
              <div class="memo-card-badges">
                <span class="category-chip">${safeCategory}</span>
                ${taskChip}
              </div>
              <span class="memo-date">${date}</span>
            </div>
            <h3>${safeTitle}</h3>
            <p>${safeContent}</p>
          </button>
          <div class="trash-card-actions">
            <button
              type="button"
              class="secondary-button compact-button"
              data-trash-action="restore"
              data-id="${escapeHtml(memo.id)}"
            >
              복원
            </button>
            <button
              type="button"
              class="danger-button compact-button"
              data-trash-action="permanent-delete"
              data-id="${escapeHtml(memo.id)}"
            >
              영구 삭제
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

let detailModalPreviousFocus = null;

function openDetailModal(memo, options = {}) {
  const modal = document.querySelector("#detailModal");
  const editButton = document.querySelector("#editMemoButton");
  const deleteButton = document.querySelector("#deleteMemoButton");
  const checklistContainer = document.querySelector("#detailChecklist");

  const detailParts = [];

  if (memo.isImportant && !memo.isDeleted) {
    detailParts.push("★ 중요");
  }

  detailParts.push(memo.isDeleted ? "휴지통" : memo.category);

  document.querySelector("#detailCategory").textContent = detailParts.join(" · ");
  document.querySelector("#detailDate").textContent = formatDate(memo.updatedAt || memo.createdAt);
  document.querySelector("#detailTitle").textContent = memo.title;
  document.querySelector("#detailContent").textContent = memo.content;

  if (checklistContainer) {
    checklistContainer.innerHTML = renderTaskChecklistHtml(memo);
  }

  editButton.dataset.id = memo.id;
  deleteButton.dataset.id = memo.id;

  if (memo.isDeleted) {
    editButton.textContent = "복구하기";
    editButton.className = "secondary-button";
    editButton.dataset.mode = "restore";

    deleteButton.textContent = "완전 삭제";
    deleteButton.className = "danger-button";
    deleteButton.dataset.mode = "permanent-delete";
  } else {
    editButton.textContent = "수정하기";
    editButton.className = "secondary-button";
    editButton.dataset.mode = "edit";

    deleteButton.textContent = "삭제하기";
    deleteButton.className = "danger-button";
    deleteButton.dataset.mode = "trash";
  }

  detailModalPreviousFocus = document.activeElement;
  modal.hidden = false;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (!options.skipHistory) {
    window.solonoteNavigation?.openLayer("detail", {
      memoId: memo.id,
    });
  }

  window.requestAnimationFrame(() => {
    document.querySelector("#closeDetailButton")?.focus();
  });
}

function closeDetailModal(options = {}) {
  const modal = document.querySelector("#detailModal");

  if (!modal || modal.hidden || modal.classList.contains("hidden")) {
    return;
  }

  if (
    !options.skipHistory &&
    window.solonoteNavigation?.closeLayer("detail")
  ) {
    return;
  }

  modal.classList.add("hidden");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (
    detailModalPreviousFocus &&
    typeof detailModalPreviousFocus.focus === "function" &&
    document.contains(detailModalPreviousFocus)
  ) {
    detailModalPreviousFocus.focus();
  }

  detailModalPreviousFocus = null;
}

function setActiveCategory(category) {
  document.querySelectorAll(".category-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
}

function openEditor(options = {}) {
  const editorPanel = document.querySelector(".editor-panel");
  const editorView = document.querySelector("#editorView");
  const notesView = document.querySelector("#notesView");
  const mobileNewMemoButton = document.querySelector("#mobileNewMemoButton");

  if (!editorPanel || !editorView) {
    return;
  }

  editorPanel.classList.remove("collapsed");
  editorView.hidden = false;
  editorView.setAttribute("aria-hidden", "false");
  notesView && (notesView.hidden = true);
  document.body.classList.add("editor-view-open");

  if (mobileNewMemoButton) {
    mobileNewMemoButton.hidden = true;
  }

  if (!options.skipHistory) {
    window.solonoteNavigation?.openLayer("editor");
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function closeEditor(options = {}) {
  const editorPanel = document.querySelector(".editor-panel");
  const editorView = document.querySelector("#editorView");
  const mobileNewMemoButton = document.querySelector("#mobileNewMemoButton");

  if (
    !options.skipHistory &&
    window.solonoteNavigation?.closeLayer("editor")
  ) {
    return;
  }

  editorPanel?.classList.add("collapsed");

  if (editorView) {
    editorView.hidden = true;
    editorView.setAttribute("aria-hidden", "true");
  }

  document.body.classList.remove("editor-view-open");

  const baseView = document.body.dataset.appView || "notes";
  if (typeof switchAppView === "function") {
    switchAppView(baseView, {
      historyMode: "none",
      scrollBehavior: "auto",
    });
  } else {
    const notesView = document.querySelector("#notesView");
    if (notesView && baseView === "notes") {
      notesView.hidden = false;
    }
  }

  if (mobileNewMemoButton) {
    mobileNewMemoButton.hidden = baseView !== "notes";
  }
}

function toggleEditor() {
  const editorPanel = document.querySelector(".editor-panel");

  if (!editorPanel || editorPanel.classList.contains("collapsed")) {
    openEditor();
    window.setTimeout(() => document.querySelector("#titleInput")?.focus(), 80);
  }
}

function setEditorMode(mode) {
  const editorTitle = document.querySelector("#editorTitle");
  const editorPageTitle = document.querySelector("#editorPageTitle");
  const saveButton = document.querySelector("#saveButton");
  const resetButton = document.querySelector("#resetButton");

  if (mode === "edit") {
    editorTitle.textContent = "메모 수정";
    editorPageTitle && (editorPageTitle.textContent = "메모 수정");
    saveButton.textContent = "수정 완료";
    resetButton.classList.remove("hidden");
    return;
  }

  editorTitle.textContent = "새 메모 작성";
  editorPageTitle && (editorPageTitle.textContent = "메모 작성");
  saveButton.textContent = "저장하기";
  resetButton.classList.add("hidden");
}

function resetForm() {
  document.querySelector("#memoForm").reset();
  document.querySelector("#editingId").value = "";

  const editingUpdatedAt = document.querySelector("#editingUpdatedAt");
  if (editingUpdatedAt) {
    editingUpdatedAt.value = "";
  }

  if (typeof resetDraftTasks === "function") {
    resetDraftTasks();
  }

  setEditorMode("create");

  if (typeof markEditorClean === "function") {
    markEditorClean();
  }
}

function cancelEditAndCloseEditor() {
  resetForm();
  closeEditor();
}

function fillFormForEdit(memo) {
  document.querySelector("#editingId").value = memo.id;

  const editingUpdatedAt = document.querySelector("#editingUpdatedAt");
  if (editingUpdatedAt) {
    editingUpdatedAt.value = memo.updatedAt || memo.createdAt || "";
  }

  document.querySelector("#titleInput").value = memo.title;
  document.querySelector("#projectInput").value = memo.project || "";
  document.querySelector("#contentInput").value = memo.content;
  document.querySelector("#categoryInput").value = memo.category;
  document.querySelector("#importantInput").checked = Boolean(memo.isImportant);

  setEditorMode("edit");
  openEditor();
  closeDetailModal();

  window.scrollTo({ top: 0, behavior: "auto" });
}
