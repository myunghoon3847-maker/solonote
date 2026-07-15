let currentCategory = "전체";
let currentSearch = "";

const memoForm = document.querySelector("#memoForm");
const titleInput = document.querySelector("#titleInput");
const contentInput = document.querySelector("#contentInput");
const categoryInput = document.querySelector("#categoryInput");
const editingIdInput = document.querySelector("#editingId");
const searchInput = document.querySelector("#searchInput");
const categoryTabs = document.querySelector("#categoryTabs");

function getFilteredMemos() {
  const search = currentSearch.trim().toLowerCase();

  return getMemos().filter((memo) => {
    const isTrashView = currentCategory === "휴지통";

    if (isTrashView && !memo.isDeleted) {
      return false;
    }

    if (!isTrashView && memo.isDeleted) {
      return false;
    }

    const matchesCategory =
      currentCategory === "전체" ||
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
    updateMemo(editingId, { title, content, category });
  } else {
    addMemo({ title, content, category });
  }

  resetForm();
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

function bindEvents() {
  memoForm.addEventListener("submit", handleFormSubmit);
  document.querySelector("#memoList").addEventListener("click", handleMemoListClick);
  categoryTabs.addEventListener("click", handleCategoryClick);
  searchInput.addEventListener("input", handleSearchInput);

  document.querySelector("#resetButton").addEventListener("click", resetForm);
  document.querySelector("#closeDetailButton").addEventListener("click", closeDetailModal);
  document.querySelector("#detailModal").addEventListener("click", handleModalClick);
  document.querySelector("#editMemoButton").addEventListener("click", handleEditClick);
  document.querySelector("#deleteMemoButton").addEventListener("click", handleDeleteClick);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDetailModal();
    }
  });
}

bindEvents();
refreshScreen();
