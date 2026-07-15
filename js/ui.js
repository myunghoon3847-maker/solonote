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

  memoCount.textContent = getMemos().length;

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
      const safeCategory = escapeHtml(memo.category);
      const date = formatDate(memo.updatedAt || memo.createdAt);

      return `
        <button type="button" class="memo-card" data-id="${memo.id}">
          <div class="memo-card-top">
            <span class="category-chip">${safeCategory}</span>
            <span class="memo-date">${date}</span>
          </div>
          <h3>${safeTitle}</h3>
          <p>${safeContent}</p>
        </button>
      `;
    })
    .join("");
}

function openDetailModal(memo) {
  const modal = document.querySelector("#detailModal");

  document.querySelector("#detailCategory").textContent = memo.category;
  document.querySelector("#detailDate").textContent = formatDate(memo.updatedAt || memo.createdAt);
  document.querySelector("#detailTitle").textContent = memo.title;
  document.querySelector("#detailContent").textContent = memo.content;

  document.querySelector("#editMemoButton").dataset.id = memo.id;
  document.querySelector("#deleteMemoButton").dataset.id = memo.id;

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

function fillFormForEdit(memo) {
  document.querySelector("#editingId").value = memo.id;
  document.querySelector("#titleInput").value = memo.title;
  document.querySelector("#contentInput").value = memo.content;
  document.querySelector("#categoryInput").value = memo.category;

  setEditorMode("edit");
  closeDetailModal();

  document.querySelector(".editor-panel").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
