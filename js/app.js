let currentCategory = "전체";
let currentSearch = "";

const memoForm = document.querySelector("#memoForm");
const titleInput = document.querySelector("#titleInput");
const contentInput = document.querySelector("#contentInput");
const categoryInput = document.querySelector("#categoryInput");
const importantInput = document.querySelector("#importantInput");
const editingIdInput = document.querySelector("#editingId");
const searchInput = document.querySelector("#searchInput");
const categoryTabs = document.querySelector("#categoryTabs");
const backupButton = document.querySelector("#backupButton");
const restoreButton = document.querySelector("#restoreButton");
const restoreInput = document.querySelector("#restoreInput");

function getFilteredMemos() {
  const search = currentSearch.trim().toLowerCase();

  return getMemos().filter((memo) => {
    const isTrashView = currentCategory === "휴지통";
    const isImportantView = currentCategory === "중요";

    if (isTrashView && !memo.isDeleted) {
      return false;
    }

    if (!isTrashView && memo.isDeleted) {
      return false;
    }

    if (isImportantView && !memo.isImportant) {
      return false;
    }

    const matchesCategory =
      currentCategory === "전체" ||
      currentCategory === "중요" ||
      currentCategory === "휴지통" ||
      memo.category === currentCategory;

    const matchesSearch =
      !search ||
      memo.title.toLowerCase().includes(search) ||
      memo.content.toLowerCase().includes(search);

    return matchesCategory && matchesSearch;
  });
}

function refreshScreen() {
  renderMemoList(getFilteredMemos());
}

function handleFormSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const category = categoryInput.value;
  const isImportant = importantInput.checked;

  if (!title) {
    alert("제목을 입력해주세요.");
    titleInput.focus();
    return;
  }

  if (!content) {
    alert("내용을 입력해주세요.");
    contentInput.focus();
    return;
  }

  const editingId = editingIdInput.value;

  if (editingId) {
    updateMemo(editingId, { title, content, category, isImportant });
  } else {
    addMemo({ title, content, category, isImportant });
  }

  resetForm();
  closeEditor();
  refreshScreen();
}

function handleMemoListClick(event) {
  const memoCard = event.target.closest(".memo-card");

  if (!memoCard) {
    return;
  }

  const memo = findMemoById(memoCard.dataset.id);

  if (memo) {
    openDetailModal(memo);
  }
}

function handleCategoryClick(event) {
  const button = event.target.closest(".category-tab");

  if (!button) {
    return;
  }

  currentCategory = button.dataset.category;
  setActiveCategory(currentCategory);
  refreshScreen();
}

function handleSearchInput(event) {
  currentSearch = event.target.value;
  refreshScreen();
}

function handleEditClick() {
  const memoId = this.dataset.id;
  const mode = this.dataset.mode;
  const memo = findMemoById(memoId);

  if (!memo) {
    return;
  }

  if (mode === "restore") {
    restoreMemo(memoId);
    closeDetailModal();
    currentCategory = "전체";
    setActiveCategory(currentCategory);
    refreshScreen();
    return;
  }

  fillFormForEdit(memo);
}

function handleDeleteClick() {
  const memoId = this.dataset.id;
  const mode = this.dataset.mode;

  if (mode === "permanent-delete") {
    const shouldDelete = confirm("휴지통에서도 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");

    if (!shouldDelete) {
      return;
    }

    permanentlyDeleteMemo(memoId);
    closeDetailModal();
    refreshScreen();
    return;
  }

  const shouldMoveToTrash = confirm("이 메모를 휴지통으로 이동하시겠습니까?");

  if (!shouldMoveToTrash) {
    return;
  }

  moveMemoToTrash(memoId);
  closeDetailModal();
  refreshScreen();
}

function handleModalClick(event) {
  if (event.target.dataset.close === "true") {
    closeDetailModal();
  }
}

function getTodayTextForFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function handleBackupClick() {
  const backupData = createBackupData();
  const memoCount = backupData.memos.length;

  if (memoCount === 0) {
    const shouldBackupEmpty = confirm("저장된 메모가 없습니다. 빈 백업 파일을 생성할까요?");

    if (!shouldBackupEmpty) {
      return;
    }
  }

  const jsonText = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const fileName = `solonote-backup-${getTodayTextForFileName()}.json`;

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  URL.revokeObjectURL(url);
}

function handleRestoreButtonClick() {
  restoreInput.value = "";
  restoreInput.click();
}

function handleRestoreFileChange(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith(".json")) {
    alert("JSON 백업 파일만 복원할 수 있습니다.");
    return;
  }

  const shouldRestore = confirm("선택한 백업 파일의 메모를 현재 메모에 추가하시겠습니까? 기존 메모는 유지됩니다.");

  if (!shouldRestore) {
    restoreInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backupData = JSON.parse(reader.result);
      const result = importMemosFromBackup(backupData);

      currentCategory = "전체";
      currentSearch = "";
      searchInput.value = "";
      setActiveCategory(currentCategory);
      refreshScreen();

      alert(`복원 완료: ${result.addedCount}개 추가, ${result.skippedCount}개 중복 제외`);
    } catch (error) {
      console.error(error);
      alert("복원에 실패했습니다. 올바른 SoloNote 백업 파일인지 확인해주세요.");
    } finally {
      restoreInput.value = "";
    }
  };

  reader.onerror = () => {
    alert("파일을 읽는 중 문제가 발생했습니다.");
    restoreInput.value = "";
  };

  reader.readAsText(file, "utf-8");
}

function bindEvents() {
  memoForm.addEventListener("submit", handleFormSubmit);
  document.querySelector("#memoList").addEventListener("click", handleMemoListClick);
  categoryTabs.addEventListener("click", handleCategoryClick);
  searchInput.addEventListener("input", handleSearchInput);

  document.querySelector("#editorToggleButton").addEventListener("click", toggleEditor);
  document.querySelector("#resetButton").addEventListener("click", cancelEditAndCloseEditor);
  document.querySelector("#closeDetailButton").addEventListener("click", closeDetailModal);
  document.querySelector("#detailModal").addEventListener("click", handleModalClick);
  document.querySelector("#editMemoButton").addEventListener("click", handleEditClick);
  document.querySelector("#deleteMemoButton").addEventListener("click", handleDeleteClick);

  backupButton.addEventListener("click", handleBackupClick);
  restoreButton.addEventListener("click", handleRestoreButtonClick);
  restoreInput.addEventListener("change", handleRestoreFileChange);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDetailModal();
    }
  });
}

bindEvents();
refreshScreen();
