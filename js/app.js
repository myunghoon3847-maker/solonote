let currentCategory = "전체";
let currentSearch = "";
let currentSort = "updatedDesc";
let currentProject = "전체";
let draftTasks = [];

const memoForm = document.querySelector("#memoForm");
const titleInput = document.querySelector("#titleInput");
const projectInput = document.querySelector("#projectInput");
const contentInput = document.querySelector("#contentInput");
const categoryInput = document.querySelector("#categoryInput");
const importantInput = document.querySelector("#importantInput");
const editingIdInput = document.querySelector("#editingId");
const searchInput = document.querySelector("#searchInput");
const categoryTabs = document.querySelector("#categoryTabs");
const sortInput = document.querySelector("#sortInput");
const projectFilterInput = document.querySelector("#projectFilterInput");
const quickProjectList = document.querySelector("#quickProjectList");
const backupButton = document.querySelector("#backupButton");
const restoreButton = document.querySelector("#restoreButton");
const totalMemoCount = document.querySelector("#totalMemoCount");
const trashMemoCount = document.querySelector("#trashMemoCount");
const emptyTrashButton = document.querySelector("#emptyTrashButton");
const resetAllDataButton = document.querySelector("#resetAllDataButton");
const guideToggleButton = document.querySelector("#guideToggleButton");
const guideContent = document.querySelector("#guideContent");
const taskInput = document.querySelector("#taskInput");
const addTaskButton = document.querySelector("#addTaskButton");
const taskDraftList = document.querySelector("#taskDraftList");
const taskCountLabel = document.querySelector("#taskCountLabel");

function parseMemoDate(dateString) {
  const time = new Date(dateString).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortMemos(memos) {
  return [...memos].sort((a, b) => {
    if (currentSort === "createdDesc") {
      return parseMemoDate(b.createdAt) - parseMemoDate(a.createdAt);
    }

    if (currentSort === "createdAsc") {
      return parseMemoDate(a.createdAt) - parseMemoDate(b.createdAt);
    }

    if (currentSort === "importantFirst") {
      const importantCompare = Number(b.isImportant) - Number(a.isImportant);

      if (importantCompare !== 0) {
        return importantCompare;
      }

      return parseMemoDate(b.updatedAt || b.createdAt) - parseMemoDate(a.updatedAt || a.createdAt);
    }

    if (currentSort === "titleAsc") {
      return String(a.title).localeCompare(String(b.title), "ko-KR");
    }

    return parseMemoDate(b.updatedAt || b.createdAt) - parseMemoDate(a.updatedAt || a.createdAt);
  });
}

function matchesProjectFilter(memo) {
  if (currentProject === "전체") {
    return true;
  }

  if (currentProject === "프로젝트 없음") {
    return !memo.project;
  }

  return memo.project === currentProject;
}

function getFilteredMemos() {
  const search = currentSearch.trim().toLowerCase();

  const filteredMemos = getMemos().filter((memo) => {
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

    if (!matchesProjectFilter(memo)) {
      return false;
    }

    const matchesCategory =
      currentCategory === "전체" ||
      currentCategory === "중요" ||
      currentCategory === "휴지통" ||
      memo.category === currentCategory;

    const taskText = Array.isArray(memo.tasks)
      ? memo.tasks.map((task) => task.text).join(" ").toLowerCase()
      : "";

    const projectText = memo.project ? memo.project.toLowerCase() : "";

    const matchesSearch =
      !search ||
      memo.title.toLowerCase().includes(search) ||
      memo.content.toLowerCase().includes(search) ||
      projectText.includes(search) ||
      taskText.includes(search);

    return matchesCategory && matchesSearch;
  });

  return sortMemos(filteredMemos);
}


function getQuickProjectOptions(limit = 8) {
  const projectMap = new Map();

  getMemos()
    .filter((memo) => !memo.isDeleted && memo.project)
    .sort((a, b) => parseMemoDate(b.updatedAt || b.createdAt) - parseMemoDate(a.updatedAt || a.createdAt))
    .forEach((memo) => {
      if (!projectMap.has(memo.project)) {
        projectMap.set(memo.project, memo.project);
      }
    });

  return [...projectMap.values()].slice(0, limit);
}

function refreshQuickProjects() {
  renderQuickProjectButtons(getQuickProjectOptions());
}

function handleQuickProjectClick(event) {
  const button = event.target.closest(".quick-project-button");

  if (!button) {
    return;
  }

  projectInput.value = button.dataset.project || "";
  projectInput.focus();
}


function refreshProjectFilter() {
  renderProjectFilterOptions(getProjectOptions(), currentProject);

  if (projectFilterInput.value !== currentProject) {
    currentProject = projectFilterInput.value;
  }
}


function refreshDataStats() {
  if (!totalMemoCount || !trashMemoCount) {
    return;
  }

  const stats = getDataStats();

  totalMemoCount.textContent = stats.totalCount;
  trashMemoCount.textContent = stats.trashCount;

  if (emptyTrashButton) {
    emptyTrashButton.disabled = stats.trashCount === 0;
  }

  if (resetAllDataButton) {
    resetAllDataButton.disabled = stats.totalCount === 0;
  }
}

function handleEmptyTrashClick() {
  const stats = getDataStats();

  if (stats.trashCount === 0) {
    alert("휴지통에 비울 메모가 없습니다.");
    return;
  }

  const shouldEmptyTrash = confirm(
    `휴지통의 메모 ${stats.trashCount}개를 모두 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
  );

  if (!shouldEmptyTrash) {
    return;
  }

  const deletedCount = emptyTrash();

  if (currentCategory === "휴지통") {
    currentCategory = "전체";
    setActiveCategory(currentCategory);
  }

  closeDetailModal();
  refreshScreen();
  alert(`휴지통 메모 ${deletedCount}개를 완전히 삭제했습니다.`);
}

function handleResetAllDataClick() {
  const stats = getDataStats();

  if (stats.totalCount === 0) {
    alert("초기화할 메모가 없습니다.");
    return;
  }

  const firstConfirm = confirm(
    `모든 메모 ${stats.totalCount}개가 삭제됩니다.\n먼저 백업하기를 눌러 백업 파일을 보관하는 것을 추천합니다.\n정말 전체 데이터를 초기화하시겠습니까?`
  );

  if (!firstConfirm) {
    return;
  }

  const secondConfirm = confirm(
    "마지막 확인입니다.\n전체 데이터 초기화는 되돌릴 수 없습니다.\n정말 삭제하시겠습니까?"
  );

  if (!secondConfirm) {
    return;
  }

  const deletedCount = resetAllData();

  currentCategory = "전체";
  currentSearch = "";
  currentProject = "전체";
  searchInput.value = "";
  setActiveCategory(currentCategory);
  resetForm();
  closeEditor();
  closeDetailModal();
  refreshScreen();

  alert(`전체 메모 ${deletedCount}개를 초기화했습니다.`);
}


function refreshScreen() {
  refreshProjectFilter();
  refreshQuickProjects();
  refreshDataStats();
  renderMemoList(getFilteredMemos());
}

function createDraftTask(text) {
  return {
    id: `task_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    text: text.trim(),
    done: false,
  };
}

function renderTaskDraftList() {
  if (!taskDraftList || !taskCountLabel) {
    return;
  }

  taskCountLabel.textContent = `${draftTasks.length}개 항목`;

  if (draftTasks.length === 0) {
    taskDraftList.innerHTML = `<li class="task-empty">아직 추가된 할 일이 없습니다.</li>`;
    return;
  }

  taskDraftList.innerHTML = draftTasks
    .map(
      (task) => `
        <li class="task-draft-item">
          <span>${escapeHtml(task.text)}</span>
          <button type="button" class="task-remove-button" data-task-id="${task.id}">삭제</button>
        </li>
      `
    )
    .join("");
}

function resetDraftTasks() {
  draftTasks = [];
  renderTaskDraftList();
}

function loadDraftTasks(tasks) {
  draftTasks = Array.isArray(tasks) ? tasks.map((task) => ({ ...task })) : [];
  renderTaskDraftList();
}

function handleAddTask() {
  const text = taskInput.value.trim();

  if (!text) {
    alert("추가할 할 일을 입력해주세요.");
    taskInput.focus();
    return;
  }

  draftTasks.push(createDraftTask(text));
  taskInput.value = "";
  renderTaskDraftList();
  taskInput.focus();
}

function handleTaskInputKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  handleAddTask();
}

function handleTaskDraftListClick(event) {
  const removeButton = event.target.closest(".task-remove-button");

  if (!removeButton) {
    return;
  }

  draftTasks = draftTasks.filter((task) => task.id !== removeButton.dataset.taskId);
  renderTaskDraftList();
}

function handleFormSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const project = projectInput.value.trim();
  const content = contentInput.value.trim();
  const category = categoryInput.value;
  const isImportant = importantInput.checked;

  if (!title) {
    alert("제목을 입력해주세요.");
    titleInput.focus();
    return;
  }

  if (!content && draftTasks.length === 0) {
    alert("내용을 입력하거나 체크리스트 항목을 추가해주세요.");
    contentInput.focus();
    return;
  }

  const editingId = editingIdInput.value;
  const memoData = {
    title,
    project,
    content,
    category,
    isImportant,
    tasks: draftTasks.map((task) => ({ ...task })),
  };

  if (editingId) {
    updateMemo(editingId, memoData);
  } else {
    addMemo(memoData);
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

function handleProjectFilterChange(event) {
  currentProject = event.target.value;
  refreshScreen();
}

function handleSortChange(event) {
  currentSort = event.target.value;
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
  loadDraftTasks(memo.tasks);
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

function handleDetailTaskToggle(event) {
  const toggleButton = event.target.closest(".task-toggle-button");

  if (!toggleButton) {
    return;
  }

  const memoId = toggleButton.dataset.memoId;
  const taskId = toggleButton.dataset.taskId;
  const updatedMemo = toggleTaskDone(memoId, taskId);

  refreshScreen();

  if (updatedMemo) {
    openDetailModal(updatedMemo);
  }
}

function handleModalClick(event) {
  handleDetailTaskToggle(event);

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
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.style.display = "none";

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) {
      fileInput.remove();
      return;
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      alert("JSON 백업 파일만 복원할 수 있습니다.");
      fileInput.remove();
      return;
    }

    const shouldRestore = confirm("선택한 백업 파일의 메모를 현재 메모에 추가하시겠습니까? 기존 메모는 유지됩니다.");

    if (!shouldRestore) {
      fileInput.remove();
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const backupData = JSON.parse(reader.result);
        const result = importMemosFromBackup(backupData);

        currentCategory = "전체";
        currentSearch = "";
        currentProject = "전체";
        searchInput.value = "";
        setActiveCategory(currentCategory);
        refreshScreen();

        alert(`복원 완료: ${result.addedCount}개 추가, ${result.skippedCount}개 중복 제외`);
      } catch (error) {
        console.error(error);
        alert("복원에 실패했습니다. 올바른 SoloNote 백업 파일인지 확인해주세요.");
      } finally {
        fileInput.remove();
      }
    };

    reader.onerror = () => {
      alert("파일을 읽는 중 문제가 발생했습니다.");
      fileInput.remove();
    };

    reader.readAsText(file, "utf-8");
  });

  document.body.appendChild(fileInput);
  fileInput.click();
}


function handleGuideToggleClick() {
  if (!guideToggleButton || !guideContent) {
    return;
  }

  const isHidden = guideContent.classList.toggle("hidden");
  guideToggleButton.textContent = isHidden ? "사용 안내 보기" : "사용 안내 접기";
}


function bindEvents() {
  memoForm.addEventListener("submit", handleFormSubmit);
  document.querySelector("#memoList").addEventListener("click", handleMemoListClick);
  categoryTabs.addEventListener("click", handleCategoryClick);
  searchInput.addEventListener("input", handleSearchInput);
  sortInput.addEventListener("change", handleSortChange);
  projectFilterInput.addEventListener("change", handleProjectFilterChange);
  quickProjectList.addEventListener("click", handleQuickProjectClick);

  document.querySelector("#editorToggleButton").addEventListener("click", toggleEditor);
  document.querySelector("#resetButton").addEventListener("click", cancelEditAndCloseEditor);
  document.querySelector("#closeDetailButton").addEventListener("click", closeDetailModal);
  document.querySelector("#detailModal").addEventListener("click", handleModalClick);
  document.querySelector("#editMemoButton").addEventListener("click", handleEditClick);
  document.querySelector("#deleteMemoButton").addEventListener("click", handleDeleteClick);

  backupButton.addEventListener("click", handleBackupClick);
  restoreButton.addEventListener("click", handleRestoreButtonClick);

  emptyTrashButton.addEventListener("click", handleEmptyTrashClick);
  resetAllDataButton.addEventListener("click", handleResetAllDataClick);

  guideToggleButton.addEventListener("click", handleGuideToggleClick);

  addTaskButton.addEventListener("click", handleAddTask);
  taskInput.addEventListener("keydown", handleTaskInputKeydown);
  taskDraftList.addEventListener("click", handleTaskDraftListClick);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDetailModal();
    }
  });
}

bindEvents();
renderTaskDraftList();
refreshScreen();


function safeBindGuideToggle() {
  const button = document.querySelector("#guideToggleButton");
  const content = document.querySelector("#guideContent");

  if (!button || !content || button.dataset.bound === "true") {
    return;
  }

  button.dataset.bound = "true";
  button.addEventListener("click", () => {
    const isHidden = content.classList.toggle("hidden");
    button.textContent = isHidden ? "사용 안내 보기" : "사용 안내 접기";
  });
}

safeBindGuideToggle();
