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

function renderMemoList(memos) {
  const memoList = document.querySelector("#memoList");
  const memoCount = document.querySelector("#memoCount");

  memoCount.textContent = getActiveMemoCount();

  if (memos.length === 0) {
    memoList.innerHTML = `
      <div class="empty-state">
        <strong>표시할 메모가 없습니다.</strong>
        <p>새 메모를 작성하거나 검색어와 카테고리를 확인해보세요.</p>
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

      return `
        <button type="button" class="memo-card" data-id="${memo.id}">
          <div class="memo-card-top">
            <div class="memo-card-badges">
              <span class="category-chip">${safeCategory}</span>
              ${memo.isImportant ? '<span class="important-chip">중요</span>' : ""}
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

  const categoryText = memo.isDeleted
    ? "휴지통"
    : memo.isImportant
      ? `★ 중요 · ${memo.category}`
      : memo.category;

  document.querySelector("#detailCategory").textContent = categoryText;
  document.querySelector("#detailDate").textContent = formatDate(memo.updatedAt || memo.createdAt);
  document.querySelector("#detailTitle").textContent = memo.title;
  document.querySelector("#detailContent").textContent = memo.content;

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
  const hasContent = Boolean(document.querySelector("#contentInput").value.trim());

  if (isEditing || hasTitle || hasContent) {
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
  setEditorMode("create");
}

function cancelEditAndCloseEditor() {
  resetForm();
  closeEditor();
}

function fillFormForEdit(memo) {
  document.querySelector("#editingId").value = memo.id;
  document.querySelector("#titleInput").value = memo.title;
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
