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
const editingUpdatedAtInput = document.querySelector("#editingUpdatedAt");
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
const cloudSyncStatus = document.querySelector("#cloudSyncStatus");
const saveButton = document.querySelector("#saveButton");
const legacyMigrationPanel = document.querySelector("#legacyMigrationPanel");
const legacyMemoCount = document.querySelector("#legacyMemoCount");
const legacyMigrationMessage = document.querySelector("#legacyMigrationMessage");
const migrateLegacyButton = document.querySelector("#migrateLegacyButton");
const cloudRefreshButton = document.querySelector("#cloudRefreshButton");
const lastSyncTime = document.querySelector("#lastSyncTime");
const showAllMemosButton = document.querySelector("#showAllMemosButton");
const resultSummary = document.querySelector("#resultSummary");
const dataManagementToggleButton = document.querySelector("#dataManagementToggleButton");
const dataManagementContent = document.querySelector("#dataManagementContent");
const mobileNewMemoButton = document.querySelector("#mobileNewMemoButton");
const draftRecoveryBanner = document.querySelector("#draftRecoveryBanner");
const draftRecoveryDescription = document.querySelector("#draftRecoveryDescription");
const restoreDraftButton = document.querySelector("#restoreDraftButton");
const discardDraftButton = document.querySelector("#discardDraftButton");
const draftSaveStatus = document.querySelector("#draftSaveStatus");
const taskHubToggleButton = document.querySelector("#taskHubToggleButton");
const taskHubContent = document.querySelector("#taskHubContent");
const taskHubList = document.querySelector("#taskHubList");
const taskHubOpenCount = document.querySelector("#taskHubOpenCount");
const taskHubResultText = document.querySelector("#taskHubResultText");
const taskHubViewTabs = document.querySelector(".task-hub-view-tabs");
const notesViewTab = document.querySelector("#notesViewTab");
const tasksViewTab = document.querySelector("#tasksViewTab");
const notesView = document.querySelector("#notesView");
const tasksView = document.querySelector("#tasksView");
const trashView = document.querySelector("#trashView");
const trashList = document.querySelector("#trashList");
const trashViewCount = document.querySelector("#trashViewCount");
const emptyTrashViewButton = document.querySelector("#emptyTrashViewButton");
const backFromTrashButton = document.querySelector("#backFromTrashButton");
const filterToggleButton = document.querySelector("#filterToggleButton");
const filterPanel = document.querySelector("#filterPanel");
const filterActiveCount = document.querySelector("#filterActiveCount");
const appMenuButton = document.querySelector("#appMenuButton");
const appMenuPanel = document.querySelector("#appMenuPanel");
const appMenuCloseButton = document.querySelector("#appMenuCloseButton");
const appMenuBackdrop = document.querySelector("#appMenuBackdrop");
const openTrashButton = document.querySelector("#openTrashButton");
const menuTrashMemoCount = document.querySelector("#menuTrashMemoCount");

let currentCloudUserId = "";
let cloudLoadSequence = 0;
let activeCloudLoadPromise = null;
let automaticSyncTimer = null;
let lastAutomaticSyncRequestAt = 0;
let appMenuCloseTimer = null;
let isAppMenuOpen = false;

const AUTO_SYNC_MIN_INTERVAL_MS = 5000;

let editorCleanSnapshot = "";
let isEditorDirty = false;
let draftAutoSaveTimer = null;
let recoverableDraft = null;

const DRAFT_STORAGE_PREFIX = "solonote_editor_draft_v4";
const DRAFT_AUTO_SAVE_DELAY_MS = 700;
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

let currentTaskHubView = "open";
let currentAppView = "notes";



function getEditorSnapshot() {
  return JSON.stringify({
    title: titleInput?.value || "",
    project: projectInput?.value || "",
    content: contentInput?.value || "",
    category: categoryInput?.value || "",
    important: Boolean(importantInput?.checked),
    editingId: editingIdInput?.value || "",
    tasks: draftTasks.map((task) => ({
      text: task.text,
      done: Boolean(task.done),
    })),
  });
}

function markEditorClean() {
  editorCleanSnapshot = getEditorSnapshot();
  isEditorDirty = false;
}

function updateEditorDirtyState() {
  isEditorDirty = getEditorSnapshot() !== editorCleanSnapshot;
  scheduleDraftAutoSave();
}


function getDraftStorageKey(userId = currentCloudUserId) {
  return userId ? `${DRAFT_STORAGE_PREFIX}:${userId}` : "";
}

function hasDraftContent(draft) {
  if (!draft) {
    return false;
  }

  return Boolean(
    String(draft.title || "").trim() ||
    String(draft.project || "").trim() ||
    String(draft.content || "").trim() ||
    String(draft.editingId || "").trim() ||
    (Array.isArray(draft.tasks) && draft.tasks.length > 0)
  );
}

function buildLocalEditorDraft() {
  return {
    version: "4.0",
    userId: currentCloudUserId,
    savedAt: new Date().toISOString(),
    title: titleInput?.value || "",
    project: projectInput?.value || "",
    content: contentInput?.value || "",
    category: categoryInput?.value || "업무",
    isImportant: Boolean(importantInput?.checked),
    editingId: editingIdInput?.value || "",
    editingUpdatedAt: editingUpdatedAtInput?.value || "",
    tasks: draftTasks.map((task) => ({
      id: task.id,
      text: task.text,
      done: Boolean(task.done),
    })),
  };
}

function formatDraftSavedTime(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function setDraftSaveStatus(message, state = "ready") {
  if (!draftSaveStatus) {
    return;
  }

  draftSaveStatus.textContent = message;
  draftSaveStatus.dataset.state = state;
}

function showDraftRecoveryBanner(draft) {
  if (!draftRecoveryBanner || !draft) {
    return;
  }

  recoverableDraft = draft;
  draftRecoveryBanner.hidden = false;
  draftRecoveryBanner.setAttribute("aria-hidden", "false");

  const savedTime = formatDraftSavedTime(draft.savedAt);
  const typeText = draft.editingId ? "수정 중이던 메모" : "작성 중이던 새 메모";

  if (draftRecoveryDescription) {
    draftRecoveryDescription.textContent =
      `${typeText}입니다` +
      (savedTime ? ` · 마지막 자동 저장 ${savedTime}` : "") +
      ".";
  }
}

function hideDraftRecoveryBanner() {
  if (!draftRecoveryBanner) {
    return;
  }

  draftRecoveryBanner.hidden = true;
  draftRecoveryBanner.setAttribute("aria-hidden", "true");
  recoverableDraft = null;
}

function readLocalEditorDraft(userId = currentCloudUserId) {
  const storageKey = getDraftStorageKey(userId);

  if (!storageKey) {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(storageKey);

    if (!rawDraft) {
      return null;
    }

    const draft = JSON.parse(rawDraft);
    const savedAt = new Date(draft.savedAt).getTime();

    if (
      !draft ||
      draft.userId !== userId ||
      Number.isNaN(savedAt) ||
      Date.now() - savedAt > DRAFT_MAX_AGE_MS ||
      !hasDraftContent(draft)
    ) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return draft;
  } catch (error) {
    console.error("초안 불러오기 실패:", error);

    try {
      window.localStorage.removeItem(storageKey);
    } catch (_) {}

    return null;
  }
}

function saveLocalEditorDraft() {
  if (!currentCloudUserId || !isEditorDirty) {
    return;
  }

  const storageKey = getDraftStorageKey();

  if (!storageKey) {
    return;
  }

  const draft = buildLocalEditorDraft();

  if (!hasDraftContent(draft)) {
    clearLocalEditorDraft();
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
    recoverableDraft = draft;
    setDraftSaveStatus(
      `초안 자동 저장됨 · ${formatDraftSavedTime(draft.savedAt)}`,
      "saved"
    );
  } catch (error) {
    console.error("초안 자동 저장 실패:", error);
    setDraftSaveStatus("초안을 자동 저장하지 못했습니다.", "error");
  }
}

function scheduleDraftAutoSave() {
  if (draftAutoSaveTimer) {
    window.clearTimeout(draftAutoSaveTimer);
  }

  if (!isEditorDirty || !currentCloudUserId) {
    return;
  }

  setDraftSaveStatus("초안 저장 준비 중...", "saving");

  draftAutoSaveTimer = window.setTimeout(() => {
    draftAutoSaveTimer = null;
    saveLocalEditorDraft();
  }, DRAFT_AUTO_SAVE_DELAY_MS);
}

function clearLocalEditorDraft(userId = currentCloudUserId) {
  if (draftAutoSaveTimer) {
    window.clearTimeout(draftAutoSaveTimer);
    draftAutoSaveTimer = null;
  }

  const storageKey = getDraftStorageKey(userId);

  if (storageKey) {
    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("초안 삭제 실패:", error);
    }
  }

  hideDraftRecoveryBanner();
  setDraftSaveStatus(
    "작성 내용은 이 브라우저에 자동 저장됩니다.",
    "ready"
  );
}

function checkForRecoverableDraft(userId = currentCloudUserId) {
  if (!userId || window.solonotePasswordRecoveryActive) {
    return;
  }

  const draft = readLocalEditorDraft(userId);

  if (draft) {
    showDraftRecoveryBanner(draft);
  } else {
    hideDraftRecoveryBanner();
  }
}

function restoreLocalEditorDraft() {
  const draft = recoverableDraft || readLocalEditorDraft();

  if (!draft) {
    alert("복구할 초안이 없습니다.");
    hideDraftRecoveryBanner();
    return;
  }

  const originalMemoExists =
    !draft.editingId || Boolean(findMemoById(draft.editingId));

  titleInput.value = draft.title || "";
  projectInput.value = draft.project || "";
  contentInput.value = draft.content || "";
  categoryInput.value = draft.category || "업무";
  importantInput.checked = Boolean(draft.isImportant);
  editingIdInput.value = originalMemoExists ? draft.editingId || "" : "";
  editingUpdatedAtInput.value = originalMemoExists
    ? draft.editingUpdatedAt || ""
    : "";

  loadDraftTasks(
    Array.isArray(draft.tasks)
      ? draft.tasks.map((task) => ({
          id: task.id || createDraftTask(task.text || "").id,
          text: String(task.text || ""),
          done: Boolean(task.done),
        }))
      : []
  );

  setEditorMode(editingIdInput.value ? "edit" : "create");
  openEditor();
  hideDraftRecoveryBanner();

  editorCleanSnapshot = "";
  updateEditorDirtyState();
  setDraftSaveStatus(
    originalMemoExists
      ? "자동 저장된 초안을 복구했습니다."
      : "원본 메모를 찾지 못해 새 메모 초안으로 복구했습니다.",
    "restored"
  );

  document.querySelector(".editor-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  window.setTimeout(() => {
    (titleInput.value.trim() ? contentInput : titleInput)?.focus();
  }, 250);
}

function discardLocalEditorDraft() {
  if (!recoverableDraft && !readLocalEditorDraft()) {
    hideDraftRecoveryBanner();
    return;
  }

  const shouldDiscard = window.confirm(
    "자동 저장된 초안을 삭제하시겠습니까? 삭제한 초안은 복구할 수 없습니다."
  );

  if (!shouldDiscard) {
    return;
  }

  clearLocalEditorDraft();
}

function hasUnsavedEditorChanges() {
  const editorPanel = document.querySelector(".editor-panel");

  return Boolean(
    isEditorDirty &&
    editorPanel &&
    !editorPanel.classList.contains("collapsed")
  );
}

function confirmDiscardEditorChanges(message = "저장하지 않은 작성 내용이 있습니다. 계속하시겠습니까?") {
  if (!hasUnsavedEditorChanges()) {
    return true;
  }

  return window.confirm(message);
}

function handleBeforeUnload(event) {
  if (!hasUnsavedEditorChanges()) {
    return;
  }

  saveLocalEditorDraft();
  event.preventDefault();
  event.returnValue = "";
}

function resetMemoFilters() {
  currentCategory = "전체";
  currentSearch = "";
  currentProject = "전체";
  currentSort = "updatedDesc";

  searchInput.value = "";
  projectFilterInput.value = "전체";
  sortInput.value = "updatedDesc";
  setActiveCategory(currentCategory);
  closeFilterPanel();
  refreshScreen();
}

function updateFilterControls(filteredMemos) {
  const hasSearch = Boolean(currentSearch.trim());
  const hasCategoryView = currentCategory !== "전체";
  const activeFilterCount = [
    currentProject !== "전체",
    currentSort !== "updatedDesc",
  ].filter(Boolean).length;
  const hasChangedView = hasSearch || hasCategoryView || activeFilterCount > 0;

  if (showAllMemosButton) {
    showAllMemosButton.hidden = !hasChangedView;
  }

  if (filterActiveCount) {
    filterActiveCount.textContent = String(activeFilterCount);
    filterActiveCount.hidden = activeFilterCount === 0;
  }

  if (filterToggleButton) {
    filterToggleButton.classList.toggle("active", activeFilterCount > 0);
  }

  if (resultSummary) {
    const visibleCount = Array.isArray(filteredMemos) ? filteredMemos.length : 0;
    const parts = [`${visibleCount}개`];

    if (currentCategory !== "전체") {
      parts.push(currentCategory);
    }

    if (currentProject !== "전체") {
      parts.push(currentProject);
    }

    if (hasSearch) {
      parts.push(`“${currentSearch.trim()}”`);
    }

    resultSummary.textContent = parts.join(" · ");
  }
}


function isEditorOpen() {
  const editorPanel = document.querySelector(".editor-panel");
  return Boolean(editorPanel && !editorPanel.classList.contains("collapsed"));
}

function syncMobileNewMemoButton() {
  if (!mobileNewMemoButton) {
    return;
  }

  mobileNewMemoButton.hidden =
    currentAppView !== "notes" || isEditorOpen();
}

function closeFilterPanel() {
  if (!filterPanel || !filterToggleButton) {
    return;
  }

  filterPanel.hidden = true;
  filterToggleButton.setAttribute("aria-expanded", "false");
}

function handleFilterToggle() {
  if (!filterPanel || !filterToggleButton) {
    return;
  }

  const willOpen = filterPanel.hidden;
  filterPanel.hidden = !willOpen;
  filterToggleButton.setAttribute("aria-expanded", String(willOpen));
}

function closeAppMenu() {
  if (!appMenuPanel || !appMenuBackdrop || !appMenuButton) {
    return;
  }

  isAppMenuOpen = false;

  if (appMenuCloseTimer) {
    window.clearTimeout(appMenuCloseTimer);
  }

  appMenuPanel.classList.remove("is-open");
  appMenuBackdrop.classList.remove("is-open");
  appMenuPanel.setAttribute("aria-hidden", "true");
  appMenuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");

  appMenuCloseTimer = window.setTimeout(() => {
    appMenuPanel.hidden = true;
    appMenuBackdrop.hidden = true;
    appMenuCloseTimer = null;
  }, 260);
}

function openAppMenu() {
  if (!appMenuPanel || !appMenuBackdrop || !appMenuButton) {
    return;
  }

  isAppMenuOpen = true;

  if (appMenuCloseTimer) {
    window.clearTimeout(appMenuCloseTimer);
    appMenuCloseTimer = null;
  }

  closeFilterPanel();
  appMenuPanel.hidden = false;
  appMenuBackdrop.hidden = false;
  appMenuPanel.setAttribute("aria-hidden", "false");
  appMenuButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!isAppMenuOpen) {
        return;
      }

      appMenuPanel.classList.add("is-open");
      appMenuBackdrop.classList.add("is-open");
      appMenuCloseButton?.focus();
    });
  });
}

function handleOpenTrashClick() {
  switchAppView("trash");
  closeAppMenu();

  window.setTimeout(() => {
    trashView?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 280);
}

function switchAppView(view) {
  const allowedViews = ["notes", "tasks", "trash"];
  currentAppView = allowedViews.includes(view) ? view : "notes";

  const isNotes = currentAppView === "notes";
  const isTasks = currentAppView === "tasks";
  const isTrash = currentAppView === "trash";

  document.body.dataset.appView = currentAppView;
  notesView.hidden = !isNotes;
  tasksView.hidden = !isTasks;
  trashView.hidden = !isTrash;

  notesViewTab.classList.toggle("active", isNotes);
  tasksViewTab.classList.toggle("active", isTasks);
  notesViewTab.setAttribute("aria-selected", String(isNotes));
  tasksViewTab.setAttribute("aria-selected", String(isTasks));

  if (!isNotes) {
    closeFilterPanel();
  }

  if (isTasks) {
    refreshTaskHub();
  }

  if (isTrash) {
    refreshTrashView();
  }

  syncMobileNewMemoButton();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handlePrimaryViewClick(event) {
  const button = event.target.closest("[data-app-view]");

  if (!button) {
    return;
  }

  switchAppView(button.dataset.appView);
}

function handleDataManagementToggle() {
  if (!dataManagementToggleButton || !dataManagementContent) {
    return;
  }

  const willOpen = dataManagementContent.hidden;
  dataManagementContent.hidden = !willOpen;
  dataManagementToggleButton.textContent = willOpen ? "닫기" : "열기";
  dataManagementToggleButton.setAttribute("aria-expanded", String(willOpen));
}

function handleMobileNewMemoClick() {
  switchAppView("notes");
  if (!confirmDiscardEditorChanges()) {
    return;
  }

  if (readLocalEditorDraft()) {
    const shouldStartNew = window.confirm(
      "자동 저장된 초안이 있습니다. 초안을 삭제하고 새 메모를 작성하시겠습니까?"
    );

    if (!shouldStartNew) {
      showDraftRecoveryBanner(readLocalEditorDraft());
      return;
    }

    clearLocalEditorDraft();
  }

  resetForm();
  openEditor();
  document.querySelector(".editor-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  window.setTimeout(() => titleInput?.focus(), 250);
}

function handleCancelEditorClick() {
  if (
    !confirmDiscardEditorChanges(
      "저장하지 않은 수정 내용이 있습니다. 수정을 취소하시겠습니까?"
    )
  ) {
    return;
  }

  clearLocalEditorDraft();
  cancelEditAndCloseEditor();
}

function handleBeforeLogout(event) {
  if (
    !confirmDiscardEditorChanges(
      "저장하지 않은 작성 내용이 있습니다. 로그아웃하시겠습니까?"
    )
  ) {
    event.preventDefault();
    return;
  }

  clearLocalEditorDraft();
  resetForm();
  closeEditor();
}

function setCloudStatus(message, state = "ready") {
  if (!cloudSyncStatus) {
    return;
  }

  cloudSyncStatus.textContent = message;
  cloudSyncStatus.dataset.state = state;
  document.body.classList.toggle("is-offline", state === "offline");
}



function isNetworkCloudError(error) {
  const message = String(error && error.message ? error.message : "");

  return (
    navigator.onLine === false ||
    /failed to fetch|network|load failed|networkerror/i.test(message)
  );
}

function setOfflineStatus() {
  setCloudStatus("오프라인 · 클라우드 저장 불가", "offline");
}

function refreshOpenDetailFromCache() {
  const modal = document.querySelector("#detailModal");
  const editButton = document.querySelector("#editMemoButton");

  if (!modal || modal.classList.contains("hidden") || !editButton) {
    return;
  }

  const memoId = editButton.dataset.id;
  const memo = memoId ? findMemoById(memoId) : null;

  if (memo) {
    openDetailModal(memo);
  } else {
    closeDetailModal();
  }
}

function scheduleAutomaticSync(reason, options = {}) {
  const {
    force = false,
    delay = 250,
  } = options;

  if (
    !currentCloudUserId ||
    navigator.onLine === false ||
    document.visibilityState === "hidden"
  ) {
    return;
  }

  if (automaticSyncTimer) {
    clearTimeout(automaticSyncTimer);
  }

  const elapsed = Date.now() - lastAutomaticSyncRequestAt;
  const waitTime = force
    ? delay
    : Math.max(delay, AUTO_SYNC_MIN_INTERVAL_MS - elapsed);

  automaticSyncTimer = setTimeout(async () => {
    automaticSyncTimer = null;
    lastAutomaticSyncRequestAt = Date.now();

    try {
      const session = await getCurrentSession();
      await loadCloudMemosForSession(session, {
        reason,
        automatic: true,
      });
    } catch (error) {
      console.error(error);

      if (isNetworkCloudError(error)) {
        setOfflineStatus();
        return;
      }

      setCloudStatus("자동 동기화 실패", "error");
    }
  }, waitTime);
}

function formatSyncTime(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function updateLastSyncTime() {
  if (lastSyncTime) {
    lastSyncTime.textContent = formatSyncTime();
  }
}

function refreshLegacyMigrationPanel() {
  if (!legacyMigrationPanel || !legacyMemoCount || !migrateLegacyButton) {
    return;
  }

  const count = getLegacyMemoCount();
  legacyMemoCount.textContent = String(count);

  if (count > 0) {
    legacyMigrationPanel.dataset.state = "available";
    legacyMigrationPanel.hidden = false;
    migrateLegacyButton.disabled = false;
    migrateLegacyButton.textContent = "기존 메모를 클라우드로 옮기기";

    if (legacyMigrationMessage) {
      legacyMigrationMessage.textContent =
        `이 브라우저에 이전 버전 메모 ${count}개가 남아 있습니다. 중복을 제외하고 클라우드에 추가할 수 있습니다.`;
    }

    return;
  }

  legacyMigrationPanel.dataset.state = "empty";
  legacyMigrationPanel.hidden = true;
  migrateLegacyButton.disabled = true;
  migrateLegacyButton.textContent = "옮길 기존 메모 없음";

  if (legacyMigrationMessage) {
    legacyMigrationMessage.textContent =
      "이 브라우저에는 이전할 기존 메모가 없습니다.";
  }
}

async function getCurrentSession() {
  const client = window.solonoteSupabase;

  if (!client) {
    throw new Error("Supabase 클라이언트가 준비되지 않았습니다.");
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  if (!data || !data.session) {
    throw new Error("로그인 세션이 없습니다. 다시 로그인해주세요.");
  }

  return data.session;
}

async function handleCloudRefreshClick() {
  if (cloudRefreshButton) {
    cloudRefreshButton.disabled = true;
    cloudRefreshButton.textContent = "새로고침 중...";
  }

  try {
    const session = await getCurrentSession();
    await loadCloudMemosForSession(session, {
      reason: "수동 새로고침",
      automatic: false,
    });
  } catch (error) {
    console.error(error);
    alert(translateCloudError(error));
  } finally {
    if (cloudRefreshButton) {
      cloudRefreshButton.disabled = false;
      cloudRefreshButton.textContent = "클라우드 새로고침";
    }
  }
}

async function handleLegacyMigrationClick() {
  const count = getLegacyMemoCount();

  if (count === 0) {
    refreshLegacyMigrationPanel();
    alert("이 브라우저에는 이전할 기존 메모가 없습니다.");
    return;
  }

  const shouldMigrate = confirm(
    `이 브라우저의 기존 메모 ${count}개를 클라우드에 추가하시겠습니까?\n\n` +
    "이미 옮겨진 메모는 중복 제외되며, 브라우저 원본은 삭제하지 않습니다."
  );

  if (!shouldMigrate) {
    return;
  }

  migrateLegacyButton.disabled = true;
  migrateLegacyButton.textContent = "클라우드로 옮기는 중...";

  const result = await runCloudAction(
    () => importLegacyMemosToCloud(),
    {
      loadingMessage: "기존 메모 이전 중",
      successMessage: "기존 메모 이전 완료",
    }
  );

  refreshLegacyMigrationPanel();

  if (!result) {
    return;
  }

  updateLastSyncTime();

  alert(
    `기존 메모 이전 완료\n` +
    `클라우드에 추가: ${result.addedCount}개\n` +
    `이미 있어 제외: ${result.skippedCount}개\n\n` +
    "브라우저의 기존 원본 메모는 그대로 보존되어 있습니다."
  );
}

function translateCloudError(error) {
  const message = String(error && error.message ? error.message : "");
  const code = String(error && error.code ? error.code : "");

  if (isMemoConflictError(error)) {
    return "다른 기기에서 이 메모가 먼저 수정되었습니다.";
  }

  if (code === "42P01" || /relation .*memos.* does not exist/i.test(message)) {
    return "Supabase에 memos 테이블이 없습니다. SQL 실행 여부를 확인하세요.";
  }

  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return "Supabase RLS 정책 또는 테이블 권한을 확인하세요.";
  }

  if (/failed to fetch|network|load failed/i.test(message)) {
    return "인터넷 연결 또는 Supabase 연결 상태를 확인하세요.";
  }

  if (/로그인 세션/i.test(message)) {
    return message;
  }

  return message || "클라우드 처리 중 오류가 발생했습니다.";
}

function showMemoListLoading(message = "클라우드 메모를 불러오고 있습니다.") {
  const memoList = document.querySelector("#memoList");

  if (!memoList) {
    return;
  }

  memoList.innerHTML = `
    <div class="empty-state cloud-loading-state">
      <strong>${escapeHtml(message)}</strong>
      <p>잠시만 기다려주세요.</p>
    </div>
  `;
}

function showMemoListError(message) {
  const memoList = document.querySelector("#memoList");

  if (!memoList) {
    return;
  }

  memoList.innerHTML = `
    <div class="empty-state cloud-error-state">
      <strong>클라우드 메모를 불러오지 못했습니다.</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

async function loadCloudMemosForSession(session, options = {}) {
  const {
    reason = "클라우드 동기화",
    automatic = false,
  } = options;

  const userId = session && session.user ? session.user.id : "";

  if (!userId) {
    clearMemoCache();
    currentCloudUserId = "";
    refreshScreen();
    setCloudStatus("로그인 필요", "error");
    return null;
  }

  if (navigator.onLine === false) {
    setOfflineStatus();

    if (!hasLoadedCloudMemos()) {
      showMemoListError("인터넷 연결 후 다시 시도해주세요.");
    }

    return null;
  }

  if (activeCloudLoadPromise) {
    return activeCloudLoadPromise;
  }

  const sequence = ++cloudLoadSequence;
  currentCloudUserId = userId;

  activeCloudLoadPromise = (async () => {
    setCloudStatus(
      automatic ? `${reason} · 확인 중` : "클라우드 동기화 중",
      "loading"
    );

    if (!automatic || !hasLoadedCloudMemos()) {
      showMemoListLoading();
    }

    try {
      await loadMemosFromCloud();

      if (sequence !== cloudLoadSequence || currentCloudUserId !== userId) {
        return null;
      }

      refreshScreen();
      refreshOpenDetailFromCache();
      refreshLegacyMigrationPanel();
      updateLastSyncTime();

      const legacyCount = getLegacyMemoCount();
      const suffix =
        legacyCount > 0
          ? ` · 기존 브라우저 메모 ${legacyCount}개 보존 중`
          : "";

      setCloudStatus(`클라우드 동기화 완료${suffix}`, "ready");
      return getMemos();
    } catch (error) {
      console.error(error);
      const message = translateCloudError(error);

      if (isNetworkCloudError(error)) {
        if (hasLoadedCloudMemos()) {
          refreshScreen();
          refreshOpenDetailFromCache();
        } else {
          showMemoListError(message);
        }

        setOfflineStatus();
        return null;
      }

      if (!hasLoadedCloudMemos()) {
        clearMemoCache();
        refreshProjectFilter();
        refreshQuickProjects();
        refreshDataStats();
        showMemoListError(message);
      } else {
        refreshScreen();
      }

      setCloudStatus("클라우드 연결 실패", "error");
      return null;
    }
  })();

  try {
    return await activeCloudLoadPromise;
  } finally {
    activeCloudLoadPromise = null;
  }
}

async function runCloudAction(action, options = {}) {
  const {
    loadingMessage = "클라우드 저장 중",
    successMessage = "클라우드에 저장됨",
    rethrowConflict = false,
  } = options;

  if (navigator.onLine === false) {
    setOfflineStatus();
    alert("현재 오프라인입니다. 인터넷에 연결한 뒤 다시 저장해주세요.");
    return null;
  }

  setCloudStatus(loadingMessage, "loading");

  try {
    const result = await action();
    refreshScreen();
    refreshOpenDetailFromCache();
    refreshLegacyMigrationPanel();
    updateLastSyncTime();
    setCloudStatus(successMessage, "ready");
    return result;
  } catch (error) {
    if (rethrowConflict && isMemoConflictError(error)) {
      throw error;
    }

    console.error(error);
    const message = translateCloudError(error);

    if (isNetworkCloudError(error)) {
      setOfflineStatus();
    } else {
      setCloudStatus("클라우드 저장 실패", "error");
    }

    alert(message);
    return null;
  }
}


function getTaskHubItems(view = currentTaskHubView) {
  const items = [];

  getMemos()
    .filter((memo) => !memo.isDeleted)
    .forEach((memo) => {
      const tasks = Array.isArray(memo.tasks) ? memo.tasks : [];

      tasks.forEach((task, taskIndex) => {
        if (view === "open" && task.done) {
          return;
        }

        items.push({
          memoId: memo.id,
          memoTitle: memo.title,
          project: memo.project,
          category: memo.category,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
          taskIndex,
          task,
        });
      });
    });

  return items.sort((left, right) => {
    if (left.task.done !== right.task.done) {
      return Number(left.task.done) - Number(right.task.done);
    }

    const dateCompare =
      parseMemoDate(right.updatedAt || right.createdAt) -
      parseMemoDate(left.updatedAt || left.createdAt);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return left.taskIndex - right.taskIndex;
  });
}

function getOpenTaskCount() {
  return getMemos()
    .filter((memo) => !memo.isDeleted)
    .reduce((count, memo) => {
      const tasks = Array.isArray(memo.tasks) ? memo.tasks : [];
      return count + tasks.filter((task) => !task.done).length;
    }, 0);
}

function refreshTaskHub() {
  const openCount = getOpenTaskCount();
  const items = getTaskHubItems();

  if (taskHubOpenCount) {
    taskHubOpenCount.textContent = String(openCount);
  }

  if (taskHubResultText) {
    taskHubResultText.textContent =
      currentTaskHubView === "open"
        ? `미완료 ${items.length}개 표시`
        : `전체 체크리스트 ${items.length}개 표시`;
  }

  taskHubViewTabs
    ?.querySelectorAll("[data-task-view]")
    .forEach((button) => {
      const isActive = button.dataset.taskView === currentTaskHubView;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

  renderTaskHub(items, currentTaskHubView);
}

function handleTaskHubToggle() {
  if (!taskHubToggleButton || !taskHubContent) {
    return;
  }

  const willOpen = taskHubContent.hidden;
  taskHubContent.hidden = !willOpen;
  taskHubToggleButton.textContent = willOpen ? "할 일 접기" : "할 일 보기";
  taskHubToggleButton.setAttribute("aria-expanded", String(willOpen));

  if (willOpen) {
    refreshTaskHub();
  }
}

function handleTaskHubViewClick(event) {
  const button = event.target.closest("[data-task-view]");

  if (!button) {
    return;
  }

  currentTaskHubView = button.dataset.taskView === "all" ? "all" : "open";
  refreshTaskHub();
}

async function toggleTaskWithConflictHandling(
  memoId,
  taskId,
  options = {}
) {
  const { openDetailAfter = false } = options;

  if (navigator.onLine === false) {
    setOfflineStatus();
    alert("현재 오프라인입니다. 인터넷에 연결한 뒤 체크해주세요.");
    return null;
  }

  const memo = findMemoById(memoId);

  if (!memo) {
    return null;
  }

  try {
    const updatedMemo = await runCloudAction(
      () => toggleTaskDone(memoId, taskId, memo.updatedAt),
      {
        loadingMessage: "체크리스트 저장 중",
        successMessage: "체크리스트 저장됨",
        rethrowConflict: true,
      }
    );

    if (updatedMemo && openDetailAfter) {
      openDetailModal(updatedMemo);
    }

    return updatedMemo;
  } catch (error) {
    if (isMemoConflictError(error) && error.serverMemo) {
      const latestMemo = replaceMemoInCache(error.serverMemo);
      refreshScreen();

      if (openDetailAfter) {
        openDetailModal(latestMemo);
      }

      setCloudStatus("최신 체크리스트 불러옴", "warning");
      alert(
        "다른 기기에서 이 메모가 먼저 변경되어 최신 체크리스트를 불러왔습니다. 다시 체크해주세요."
      );
      return null;
    }

    console.error(error);
    alert(translateCloudError(error));
    return null;
  }
}

async function handleTaskHubClick(event) {
  const actionButton = event.target.closest("[data-task-action]");

  if (!actionButton) {
    return;
  }

  const memoId = actionButton.dataset.memoId;
  const action = actionButton.dataset.taskAction;

  if (action === "open-memo") {
    const memo = findMemoById(memoId);

    if (memo) {
      openDetailModal(memo);
    }

    return;
  }

  if (action !== "toggle") {
    return;
  }

  const taskId = actionButton.dataset.taskId;
  actionButton.disabled = true;

  await toggleTaskWithConflictHandling(memoId, taskId);
}

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
    if (memo.isDeleted) {
      return false;
    }

    const isImportantView = currentCategory === "중요";

    if (isImportantView && !memo.isImportant) {
      return false;
    }

    if (!matchesProjectFilter(memo)) {
      return false;
    }

    const matchesCategory =
      currentCategory === "전체" ||
      currentCategory === "중요" ||
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

function getTrashMemos() {
  return getMemos()
    .filter((memo) => memo.isDeleted)
    .sort(
      (a, b) =>
        parseMemoDate(b.updatedAt || b.createdAt) -
        parseMemoDate(a.updatedAt || a.createdAt)
    );
}

function refreshTrashView() {
  const trashMemos = getTrashMemos();

  if (trashViewCount) {
    trashViewCount.textContent = String(trashMemos.length);
  }

  if (emptyTrashViewButton) {
    emptyTrashViewButton.disabled = trashMemos.length === 0;
  }

  renderTrashList(trashMemos);
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
  const stats = getDataStats();

  if (totalMemoCount) {
    totalMemoCount.textContent = stats.totalCount;
  }

  if (trashMemoCount) {
    trashMemoCount.textContent = stats.trashCount;
  }

  if (menuTrashMemoCount) {
    menuTrashMemoCount.textContent = stats.trashCount;
  }

  if (emptyTrashButton) {
    emptyTrashButton.disabled = stats.trashCount === 0;
  }

  if (emptyTrashViewButton) {
    emptyTrashViewButton.disabled = stats.trashCount === 0;
  }

  if (resetAllDataButton) {
    resetAllDataButton.disabled = stats.totalCount === 0;
  }
}

async function handleEmptyTrashClick() {
  const stats = getDataStats();

  if (stats.trashCount === 0) {
    alert("휴지통에 비울 메모가 없습니다.");
    return;
  }

  const shouldEmptyTrash = confirm(
    `클라우드 휴지통의 메모 ${stats.trashCount}개를 모두 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
  );

  if (!shouldEmptyTrash) {
    return;
  }

  const deletedCount = await runCloudAction(
    () => emptyTrash(),
    {
      loadingMessage: "휴지통 삭제 중",
      successMessage: "휴지통 비우기 완료",
    }
  );

  if (deletedCount === null) {
    return;
  }

  closeDetailModal();
  refreshScreen();
  alert(`클라우드 휴지통 메모 ${deletedCount}개를 완전히 삭제했습니다.`);
}

async function handleResetAllDataClick() {
  const stats = getDataStats();

  if (stats.totalCount === 0) {
    alert("삭제할 클라우드 메모가 없습니다.");
    return;
  }

  const firstConfirm = confirm(
    `클라우드에 저장된 모든 메모 ${stats.totalCount}개가 삭제됩니다.\n먼저 백업하기를 눌러 JSON 파일을 보관하는 것을 추천합니다.\n정말 전체 클라우드 데이터를 삭제하시겠습니까?`
  );

  if (!firstConfirm) {
    return;
  }

  const secondConfirm = confirm(
    "마지막 확인입니다.\n전체 클라우드 데이터 삭제는 되돌릴 수 없습니다.\n정말 삭제하시겠습니까?"
  );

  if (!secondConfirm) {
    return;
  }

  const deletedCount = await runCloudAction(
    () => resetAllData(),
    {
      loadingMessage: "전체 클라우드 데이터 삭제 중",
      successMessage: "클라우드 데이터 삭제 완료",
    }
  );

  if (deletedCount === null) {
    return;
  }

  currentCategory = "전체";
  currentSearch = "";
  currentProject = "전체";
  searchInput.value = "";
  setActiveCategory(currentCategory);
  resetForm();
  closeEditor();
  closeDetailModal();
  refreshScreen();

  alert(`클라우드 메모 ${deletedCount}개를 삭제했습니다.`);
}


function refreshScreen() {
  refreshProjectFilter();
  refreshQuickProjects();
  refreshDataStats();
  refreshTaskHub();

  const filteredMemos = getFilteredMemos();
  renderMemoList(filteredMemos);
  updateFilterControls(filteredMemos);
  refreshTrashView();
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
          <button type="button" class="task-remove-button" data-task-id="${task.id}" aria-label="체크리스트 항목 삭제">삭제</button>
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
  updateEditorDirtyState();
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
  updateEditorDirtyState();
}


function formatConflictTime(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "확인할 수 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function loadLatestServerMemo(serverMemo) {
  if (!serverMemo) {
    return;
  }

  const latestMemo = replaceMemoInCache(serverMemo);
  resetForm();
  closeEditor();
  refreshScreen();
  openDetailModal(latestMemo);
  updateLastSyncTime();
  setCloudStatus("서버의 최신 내용 불러옴", "ready");
}

async function saveEditedMemoWithConflictResolution(
  memoId,
  memoData,
  expectedUpdatedAt
) {
  try {
    const savedMemo = await runCloudAction(
      () => updateMemo(memoId, memoData, expectedUpdatedAt),
      {
        loadingMessage: "메모 수정 저장 중",
        successMessage: "클라우드에 저장됨",
        rethrowConflict: true,
      }
    );

    return {
      status: savedMemo ? "saved" : "failed",
      memo: savedMemo,
    };
  } catch (error) {
    if (!isMemoConflictError(error)) {
      console.error(error);
      alert(translateCloudError(error));
      return { status: "failed", memo: null };
    }

    const serverMemo = error.serverMemo;

    if (!serverMemo) {
      alert("최신 서버 메모를 확인하지 못했습니다. 클라우드 새로고침 후 다시 시도해주세요.");
      return { status: "failed", memo: null };
    }

    setCloudStatus("동시 수정 충돌 감지", "warning");

    const shouldOverwrite = confirm(
      "다른 기기 또는 브라우저에서 이 메모가 먼저 수정되었습니다.\n\n" +
      `서버의 최근 수정: ${formatConflictTime(serverMemo.updatedAt)}\n\n` +
      "[확인] 현재 작성 내용을 서버에 덮어쓰기\n" +
      "[취소] 현재 작성을 취소하고 서버의 최신 내용 불러오기"
    );

    if (!shouldOverwrite) {
      loadLatestServerMemo(serverMemo);
      return { status: "reloaded", memo: serverMemo };
    }

    try {
      const overwrittenMemo = await runCloudAction(
        () => updateMemo(memoId, memoData, serverMemo.updatedAt),
        {
          loadingMessage: "충돌 확인 후 덮어쓰는 중",
          successMessage: "현재 내용으로 덮어쓰기 완료",
          rethrowConflict: true,
        }
      );

      return {
        status: overwrittenMemo ? "saved" : "failed",
        memo: overwrittenMemo,
      };
    } catch (secondError) {
      if (isMemoConflictError(secondError) && secondError.serverMemo) {
        loadLatestServerMemo(secondError.serverMemo);
        alert(
          "덮어쓰는 동안 다른 기기에서 메모가 다시 변경되어 최신 서버 내용을 불러왔습니다."
        );
        return { status: "reloaded", memo: secondError.serverMemo };
      }

      console.error(secondError);
      alert(translateCloudError(secondError));
      return { status: "failed", memo: null };
    }
  }
}

async function handleFormSubmit(event) {
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

  if (navigator.onLine === false) {
    setOfflineStatus();
    alert("현재 오프라인입니다. 인터넷에 연결한 뒤 저장해주세요.");
    return;
  }

  const editingId = editingIdInput.value;
  const expectedUpdatedAt = editingUpdatedAtInput
    ? editingUpdatedAtInput.value
    : "";

  const memoData = {
    title,
    project,
    content,
    category,
    isImportant,
    tasks: draftTasks.map((task) => ({ ...task })),
  };

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = editingId
      ? "수정 저장 중..."
      : "클라우드 저장 중...";
  }

  let result;

  if (editingId) {
    result = await saveEditedMemoWithConflictResolution(
      editingId,
      memoData,
      expectedUpdatedAt
    );
  } else {
    const newMemo = await runCloudAction(
      () => addMemo(memoData),
      {
        loadingMessage: "새 메모 저장 중",
        successMessage: "클라우드에 저장됨",
      }
    );

    result = {
      status: newMemo ? "saved" : "failed",
      memo: newMemo,
    };
  }

  if (saveButton) {
    saveButton.disabled = false;
  }

  if (result.status === "reloaded") {
    return;
  }

  if (result.status !== "saved" || !result.memo) {
    setEditorMode(editingId ? "edit" : "create");
    return;
  }

  clearLocalEditorDraft();
  resetForm();
  closeEditor();
  refreshScreen();
}

function handleMemoListClick(event) {
  const emptyActionButton = event.target.closest("[data-empty-action]");

  if (emptyActionButton) {
    const action = emptyActionButton.dataset.emptyAction;

    if (action === "create") {
      handleMobileNewMemoClick();
    }

    if (action === "reset") {
      resetMemoFilters();
    }

    return;
  }

  const memoCard = event.target.closest(".memo-card");

  if (!memoCard) {
    return;
  }

  const memo = findMemoById(memoCard.dataset.id);

  if (memo) {
    openDetailModal(memo);
  }
}


async function handleTrashListClick(event) {
  const actionButton = event.target.closest("[data-trash-action]");

  if (actionButton) {
    const memoId = actionButton.dataset.id;
    const action = actionButton.dataset.trashAction;

    if (!memoId) {
      return;
    }

    if (action === "restore") {
      actionButton.disabled = true;

      const restoredMemo = await runCloudAction(
        () => restoreMemo(memoId),
        {
          loadingMessage: "메모 복구 중",
          successMessage: "메모 복구 완료",
        }
      );

      if (!restoredMemo) {
        actionButton.disabled = false;
        return;
      }

      refreshScreen();
      return;
    }

    if (action === "permanent-delete") {
      const memo = findMemoById(memoId);
      const title = memo?.title ? `“${memo.title}”` : "이 메모";
      const shouldDelete = confirm(
        `${title}를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      );

      if (!shouldDelete) {
        return;
      }

      actionButton.disabled = true;

      const result = await runCloudAction(
        async () => {
          await permanentlyDeleteMemo(memoId);
          return true;
        },
        {
          loadingMessage: "메모 완전 삭제 중",
          successMessage: "메모 완전 삭제 완료",
        }
      );

      if (!result) {
        actionButton.disabled = false;
        return;
      }

      closeDetailModal();
      refreshScreen();
      return;
    }
  }

  const openButton = event.target.closest("[data-trash-open]");

  if (!openButton) {
    return;
  }

  const memo = findMemoById(openButton.dataset.trashOpen);

  if (memo) {
    openDetailModal(memo);
  }
}

function handleBackFromTrashClick() {
  switchAppView("notes");
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

async function handleEditClick() {
  const memoId = this.dataset.id;
  const mode = this.dataset.mode;
  const memo = findMemoById(memoId);

  if (!memo) {
    return;
  }

  if (mode === "restore") {
    const restoredMemo = await runCloudAction(
      () => restoreMemo(memoId),
      {
        loadingMessage: "메모 복구 중",
        successMessage: "메모 복구 완료",
      }
    );

    if (!restoredMemo) {
      return;
    }

    closeDetailModal();

    if (currentAppView !== "trash") {
      currentCategory = "전체";
      setActiveCategory(currentCategory);
    }

    refreshScreen();
    return;
  }

  switchAppView("notes");
  fillFormForEdit(memo);
  loadDraftTasks(memo.tasks);
  markEditorClean();
}

async function handleDeleteClick() {
  const memoId = this.dataset.id;
  const mode = this.dataset.mode;

  if (mode === "permanent-delete") {
    const shouldDelete = confirm(
      "클라우드 휴지통에서도 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    );

    if (!shouldDelete) {
      return;
    }

    const result = await runCloudAction(
      async () => {
        await permanentlyDeleteMemo(memoId);
        return true;
      },
      {
        loadingMessage: "메모 완전 삭제 중",
        successMessage: "메모 완전 삭제 완료",
      }
    );

    if (!result) {
      return;
    }

    closeDetailModal();
    refreshScreen();
    return;
  }

  const shouldMoveToTrash = confirm("이 메모를 클라우드 휴지통으로 이동하시겠습니까?");

  if (!shouldMoveToTrash) {
    return;
  }

  const movedMemo = await runCloudAction(
    () => moveMemoToTrash(memoId),
    {
      loadingMessage: "휴지통으로 이동 중",
      successMessage: "휴지통으로 이동됨",
    }
  );

  if (!movedMemo) {
    return;
  }

  closeDetailModal();
  refreshScreen();
}

async function handleDetailTaskToggle(event) {
  const toggleButton = event.target.closest(".task-toggle-button");

  if (!toggleButton) {
    return;
  }

  toggleButton.disabled = true;

  await toggleTaskWithConflictHandling(
    toggleButton.dataset.memoId,
    toggleButton.dataset.taskId,
    {
      openDetailAfter: true,
    }
  );
}

function handleModalClick(event) {
  void handleDetailTaskToggle(event);

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
  const fileName = `훈노트-backup-${getTodayTextForFileName()}.json`;

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

    const shouldRestore = confirm(
      "선택한 백업 파일의 메모를 현재 클라우드 메모에 추가하시겠습니까? 기존 클라우드 메모는 유지됩니다."
    );

    if (!shouldRestore) {
      fileInput.remove();
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const backupData = JSON.parse(reader.result);

        const result = await runCloudAction(
          () => importMemosFromBackup(backupData),
          {
            loadingMessage: "백업 메모를 클라우드로 가져오는 중",
            successMessage: "클라우드 복원 완료",
          }
        );

        if (!result) {
          return;
        }

        currentCategory = "전체";
        currentSearch = "";
        currentProject = "전체";
        searchInput.value = "";
        setActiveCategory(currentCategory);
        refreshScreen();

        alert(
          `클라우드 복원 완료: ${result.addedCount}개 추가, ${result.skippedCount}개 중복 제외`
        );
      } catch (error) {
        console.error(error);
        alert(
          error instanceof SyntaxError
            ? "JSON 파일 형식이 올바르지 않습니다."
            : translateCloudError(error)
        );
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

  const willOpen = guideContent.hidden;
  guideContent.hidden = !willOpen;
  guideContent.classList.toggle("hidden", !willOpen);
  guideToggleButton.textContent = willOpen ? "닫기" : "열기";
  guideToggleButton.setAttribute("aria-expanded", String(willOpen));
}


function bindEvents() {
  memoForm.addEventListener("submit", handleFormSubmit);
  memoForm.addEventListener("input", updateEditorDirtyState);
  memoForm.addEventListener("change", updateEditorDirtyState);

  document.querySelector("#memoList").addEventListener("click", handleMemoListClick);
  trashList?.addEventListener("click", (event) => {
    void handleTrashListClick(event);
  });
  categoryTabs.addEventListener("click", handleCategoryClick);
  searchInput.addEventListener("input", handleSearchInput);
  sortInput.addEventListener("change", handleSortChange);
  projectFilterInput.addEventListener("change", handleProjectFilterChange);
  quickProjectList.addEventListener("click", handleQuickProjectClick);

  document.querySelector("#editorToggleButton").addEventListener("click", toggleEditor);
  document.querySelector("#resetButton").addEventListener("click", handleCancelEditorClick);
  document.querySelector("#closeDetailButton").addEventListener("click", closeDetailModal);
  document.querySelector("#detailModal").addEventListener("click", handleModalClick);
  document.querySelector("#editMemoButton").addEventListener("click", handleEditClick);
  document.querySelector("#deleteMemoButton").addEventListener("click", handleDeleteClick);

  backupButton.addEventListener("click", handleBackupClick);
  restoreButton.addEventListener("click", handleRestoreButtonClick);
  emptyTrashButton.addEventListener("click", handleEmptyTrashClick);
  emptyTrashViewButton?.addEventListener("click", handleEmptyTrashClick);
  backFromTrashButton?.addEventListener("click", handleBackFromTrashClick);
  resetAllDataButton.addEventListener("click", handleResetAllDataClick);
  cloudRefreshButton.addEventListener("click", handleCloudRefreshClick);
  migrateLegacyButton.addEventListener("click", handleLegacyMigrationClick);

  guideToggleButton.addEventListener("click", handleGuideToggleClick);
  showAllMemosButton.addEventListener("click", resetMemoFilters);
  dataManagementToggleButton.addEventListener("click", handleDataManagementToggle);
  mobileNewMemoButton.addEventListener("click", handleMobileNewMemoClick);
  restoreDraftButton.addEventListener("click", restoreLocalEditorDraft);
  discardDraftButton.addEventListener("click", discardLocalEditorDraft);

  addTaskButton.addEventListener("click", handleAddTask);
  taskInput.addEventListener("keydown", handleTaskInputKeydown);
  taskDraftList.addEventListener("click", handleTaskDraftListClick);
  taskHubViewTabs.addEventListener("click", handleTaskHubViewClick);
  taskHubList.addEventListener("click", (event) => {
    void handleTaskHubClick(event);
  });

  notesViewTab.parentElement.addEventListener("click", handlePrimaryViewClick);
  filterToggleButton.addEventListener("click", handleFilterToggle);
  appMenuButton.addEventListener("click", openAppMenu);
  appMenuCloseButton.addEventListener("click", closeAppMenu);
  appMenuBackdrop.addEventListener("click", closeAppMenu);
  openTrashButton?.addEventListener("click", handleOpenTrashClick);

  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("solonote-before-logout", handleBeforeLogout);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (!appMenuPanel.hidden) {
      closeAppMenu();
      return;
    }

    if (!filterPanel.hidden) {
      closeFilterPanel();
      return;
    }

    closeDetailModal();
  });

  window.addEventListener("online", () => {
    setCloudStatus("인터넷 재연결 · 동기화 준비", "loading");
    scheduleAutomaticSync("인터넷 재연결", {
      force: true,
      delay: 100,
    });
  });

  window.addEventListener("offline", () => {
    if (automaticSyncTimer) {
      clearTimeout(automaticSyncTimer);
      automaticSyncTimer = null;
    }

    setOfflineStatus();
  });

  window.addEventListener("focus", () => {
    scheduleAutomaticSync("앱 화면 복귀");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleAutomaticSync("앱 화면 복귀");
    }
  });
}

bindEvents();
renderTaskDraftList();
markEditorClean();
setDraftSaveStatus(
  "작성 내용은 이 브라우저에 자동 저장됩니다.",
  "ready"
);
clearMemoCache();
refreshScreen();
refreshLegacyMigrationPanel();

if (guideContent) {
  guideContent.hidden = true;
  guideContent.classList.add("hidden");
}

if (dataManagementContent) {
  dataManagementContent.hidden = true;
}

if (filterPanel) {
  filterPanel.hidden = true;
}

if (appMenuPanel && appMenuBackdrop) {
  appMenuPanel.classList.remove("is-open");
  appMenuBackdrop.classList.remove("is-open");
  appMenuPanel.hidden = true;
  appMenuBackdrop.hidden = true;
}

switchAppView("notes");

if (navigator.onLine === false) {
  setOfflineStatus();
} else {
  setCloudStatus("클라우드 연결 준비 중", "loading");
}

window.addEventListener("solonote-auth-changed", (event) => {
  const session = event.detail && event.detail.session;

  if (window.solonotePasswordRecoveryActive) {
    cloudLoadSequence += 1;
    currentCloudUserId = "";
    clearMemoCache();
    refreshScreen();
    setCloudStatus("비밀번호 재설정 중", "loading");
    return;
  }

  if (!session) {
    const previousUserId = currentCloudUserId;
    cloudLoadSequence += 1;
    currentCloudUserId = "";
    recoverableDraft = null;
    hideDraftRecoveryBanner();
    clearMemoCache();
    closeDetailModal();
    refreshScreen();
    setCloudStatus("로그인 필요", "error");
    return;
  }

  currentCloudUserId = session.user.id;
  checkForRecoverableDraft(currentCloudUserId);

  void loadCloudMemosForSession(session, {
    reason: "로그인",
    automatic: false,
  });
});

(async function initializeCloudMemos() {
  const client = window.solonoteSupabase;

  if (!client) {
    setCloudStatus("Supabase 연결 실패", "error");
    showMemoListError("Supabase 클라이언트가 준비되지 않았습니다.");
    return;
  }

  try {
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    if (window.solonotePasswordRecoveryActive) {
      return;
    }

    if (data && data.session) {
      currentCloudUserId = data.session.user.id;
      checkForRecoverableDraft(currentCloudUserId);

      await loadCloudMemosForSession(data.session, {
        reason: "앱 시작",
        automatic: false,
      });

      checkForRecoverableDraft(currentCloudUserId);
    }
  } catch (error) {
    console.error(error);
    const message = translateCloudError(error);
    setCloudStatus("클라우드 연결 실패", "error");
    showMemoListError(message);
  }
})();

