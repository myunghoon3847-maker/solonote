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
                <button type="button" class="task-toggle-button" data-memo-id="${memo.id}" data-task-id="${task.id}">
                  <span class="task-checkmark">${task.done ? "✓" : ""}</span>
                  <span class="task-text">${escapeHtml(task.text)}</span>
                </button>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderProjectFilterOptions(projects, currentProject) {
  const projectFilterInput = document.querySelector("#projectFilterInput");

  if (!projectFilterInput) {
    return;
  }

  const selectedValue = currentProject || "전체";
  const options = [
    `<option value="전체">전체</option>`,
    `<option value="프로젝트 없음">프로젝트 없음</option>`,
    ...projects.map((project) => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`),
  ];

  projectFilterInput.innerHTML = options.join("");

  const hasSelectedValue = [...projectFilterInput.options].some((option) => option.value === selectedValue);
  projectFilterInput.value = hasSelectedValue ? selectedValue : "전체";
}

function renderMemoList(memos) {
  const memoList = document.querySelector("#memoList");
  const memoCount = document.querySelector("#memoCount");

  memoCount.textContent = getActiveMemoCount();

  if (memos.length === 0) {
    memoList.innerHTML = `
      <div class="empty-state">
        <strong>표시할 메모가 없습니다.</strong>
        <p>새 메모를 작성하거나 검색어, 프로젝트, 카테고리를 확인해보세요.</p>
      </div>
    `;
    return;
  }

  memoList.innerHTML = memos
    .map((memo) => {
      const safeTitle = escapeHtml(memo.title);
      const safeContent = escapeHtml(memo.content);
      const safeCategory = memo.isDeleted ? "휴지통" : escapeHtml(memo.category);
      const safeProject = memo.project ? escapeHtml(memo.project) : "";
      const date = formatDate(memo.updatedAt || memo.createdAt);
      const importantMark = memo.isImportant ? '<span class="star-mark" aria-label="중요 메모">★</span>' : "";
      const progress = getTaskProgress(memo.tasks);
      const taskChip =
        progress.total > 0
          ? `<span class="task-progress-chip">체크 ${progress.done}/${progress.total}</span>`
          : "";
      const projectChip = safeProject ? `<span class="project-chip">${safeProject}</span>` : "";

      return `
        <button type="button" class="memo-card" data-id="${memo.id}">
          <div class="memo-card-top">
            <div class="memo-card-badges">
              <span class="category-chip">${safeCategory}</span>
              ${projectChip}
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

function openDetailModal(memo) {
  const modal = document.querySelector("#detailModal");
  const editButton = document.querySelector("#editMemoButton");
  const deleteButton = document.querySelector("#deleteMemoButton");
  const checklistContainer = document.querySelector("#detailChecklist");

  const detailParts = [];

  if (memo.isImportant && !memo.isDeleted) {
    detailParts.push("★ 중요");
  }

  detailParts.push(memo.isDeleted ? "휴지통" : memo.category);

  if (memo.project) {
    detailParts.push(memo.project);
  }

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

  modal.classList.remove("hidden");
}

function closeDetailModal() {
  document.querySelector("#detailModal").classList.add("hidden");
}

function setActiveCategory(category) {
  document.querySelectorAll(".category-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
}

function openEditor() {
  const editorPanel = document.querySelector(".editor-panel");
  const toggleButton = document.querySelector("#editorToggleButton");

  editorPanel.classList.remove("collapsed");
  toggleButton.textContent = "작성 영역 닫기";
  toggleButton.classList.remove("primary-button");
  toggleButton.classList.add("ghost-button");
}

function closeEditor() {
  const editorPanel = document.querySelector(".editor-panel");
  const toggleButton = document.querySelector("#editorToggleButton");

  editorPanel.classList.add("collapsed");
  toggleButton.textContent = "+ 새 메모 작성";
  toggleButton.classList.remove("ghost-button");
  toggleButton.classList.add("primary-button");
}

function toggleEditor() {
  const editorPanel = document.querySelector(".editor-panel");

  if (editorPanel.classList.contains("collapsed")) {
    openEditor();
    document.querySelector("#titleInput").focus();
    return;
  }

  const isEditing = Boolean(document.querySelector("#editingId").value);
  const hasTitle = Boolean(document.querySelector("#titleInput").value.trim());
  const hasProject = Boolean(document.querySelector("#projectInput").value.trim());
  const hasContent = Boolean(document.querySelector("#contentInput").value.trim());
  const hasTasks = Boolean(document.querySelectorAll("#taskDraftList .task-draft-item").length);

  if (isEditing || hasTitle || hasProject || hasContent || hasTasks) {
    const shouldClose = confirm("작성 중인 내용이 있습니다. 작성 영역을 닫으시겠습니까?");

    if (!shouldClose) {
      return;
    }

    resetForm();
  }

  closeEditor();
}

function setEditorMode(mode) {
  const editorTitle = document.querySelector("#editorTitle");
  const saveButton = document.querySelector("#saveButton");
  const resetButton = document.querySelector("#resetButton");

  if (mode === "edit") {
    editorTitle.textContent = "메모 수정";
    saveButton.textContent = "수정 완료";
    resetButton.classList.remove("hidden");
    return;
  }

  editorTitle.textContent = "새 메모 작성";
  saveButton.textContent = "저장하기";
  resetButton.classList.add("hidden");
}

function resetForm() {
  document.querySelector("#memoForm").reset();
  document.querySelector("#editingId").value = "";

  if (typeof resetDraftTasks === "function") {
    resetDraftTasks();
  }

  setEditorMode("create");
}

function cancelEditAndCloseEditor() {
  resetForm();
  closeEditor();
}

function fillFormForEdit(memo) {
  document.querySelector("#editingId").value = memo.id;
  document.querySelector("#titleInput").value = memo.title;
  document.querySelector("#projectInput").value = memo.project || "";
  document.querySelector("#contentInput").value = memo.content;
  document.querySelector("#categoryInput").value = memo.category;
  document.querySelector("#importantInput").checked = Boolean(memo.isImportant);

  setEditorMode("edit");
  openEditor();
  closeDetailModal();

  document.querySelector(".editor-panel").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
