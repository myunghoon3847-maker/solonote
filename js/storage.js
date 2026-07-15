const STORAGE_KEY = "solonote_memos_v1";

function createSafeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeTask(task) {
  return {
    id: task && task.id ? task.id : createSafeId("task"),
    text: task && typeof task.text === "string" ? task.text : "",
    done: Boolean(task && task.done),
  };
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks
    .map(normalizeTask)
    .filter((task) => task.text.trim().length > 0);
}

function normalizeProject(project) {
  return typeof project === "string" ? project.trim() : "";
}

function normalizeMemo(memo) {
  return {
    ...memo,
    id: memo.id || createSafeId("memo_imported"),
    title: typeof memo.title === "string" ? memo.title : "제목 없음",
    content: typeof memo.content === "string" ? memo.content : "",
    category: typeof memo.category === "string" ? memo.category : "업무",
    project: normalizeProject(memo.project),
    createdAt: memo.createdAt || new Date().toISOString(),
    updatedAt: memo.updatedAt || memo.createdAt || new Date().toISOString(),
    isArchived: memo.isArchived ?? memo.category === "보관",
    isDeleted: memo.isDeleted ?? false,
    isImportant: memo.isImportant ?? false,
    tasks: normalizeTasks(memo.tasks),
  };
}

function getMemos() {
  const savedMemos = localStorage.getItem(STORAGE_KEY);

  if (!savedMemos) {
    return [];
  }

  try {
    return JSON.parse(savedMemos).map(normalizeMemo);
  } catch (error) {
    console.error("메모 데이터를 불러오지 못했습니다.", error);
    return [];
  }
}

function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos.map(normalizeMemo)));
}

function createMemo({ title, content, category, project, isImportant, tasks }) {
  const now = new Date().toISOString();

  return normalizeMemo({
    id: `memo_${Date.now()}`,
    title,
    content,
    category,
    project,
    createdAt: now,
    updatedAt: now,
    isArchived: category === "보관",
    isDeleted: false,
    isImportant: Boolean(isImportant),
    tasks,
  });
}

function addMemo(memoData) {
  const memos = getMemos();
  const newMemo = createMemo(memoData);

  memos.unshift(newMemo);
  saveMemos(memos);

  return newMemo;
}

function updateMemo(id, updatedData) {
  const memos = getMemos();

  const updatedMemos = memos.map((memo) => {
    if (memo.id !== id) {
      return memo;
    }

    return normalizeMemo({
      ...memo,
      ...updatedData,
      isArchived: updatedData.category === "보관",
      isImportant: Boolean(updatedData.isImportant),
      project: normalizeProject(updatedData.project),
      tasks: normalizeTasks(updatedData.tasks),
      updatedAt: new Date().toISOString(),
    });
  });

  saveMemos(updatedMemos);

  return updatedMemos.find((memo) => memo.id === id);
}

function moveMemoToTrash(id) {
  const memos = getMemos();

  const updatedMemos = memos.map((memo) => {
    if (memo.id !== id) {
      return memo;
    }

    return {
      ...memo,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };
  });

  saveMemos(updatedMemos);
}

function restoreMemo(id) {
  const memos = getMemos();

  const updatedMemos = memos.map((memo) => {
    if (memo.id !== id) {
      return memo;
    }

    return {
      ...memo,
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    };
  });

  saveMemos(updatedMemos);
}

function permanentlyDeleteMemo(id) {
  const memos = getMemos();
  const remainingMemos = memos.filter((memo) => memo.id !== id);

  saveMemos(remainingMemos);
}

function toggleTaskDone(memoId, taskId) {
  const memos = getMemos();

  const updatedMemos = memos.map((memo) => {
    if (memo.id !== memoId) {
      return memo;
    }

    return normalizeMemo({
      ...memo,
      tasks: memo.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          done: !task.done,
        };
      }),
      updatedAt: new Date().toISOString(),
    });
  });

  saveMemos(updatedMemos);

  return updatedMemos.find((memo) => memo.id === memoId);
}

function findMemoById(id) {
  return getMemos().find((memo) => memo.id === id);
}

function getActiveMemoCount() {
  return getMemos().filter((memo) => !memo.isDeleted).length;
}

function getProjectOptions() {
  const projects = getMemos()
    .filter((memo) => !memo.isDeleted)
    .map((memo) => normalizeProject(memo.project))
    .filter(Boolean);

  return [...new Set(projects)].sort((a, b) => a.localeCompare(b, "ko-KR"));
}

function createBackupData() {
  return {
    app: "SoloNote",
    backupVersion: "2.0",
    exportedAt: new Date().toISOString(),
    memos: getMemos(),
  };
}

function extractMemosFromBackup(backupData) {
  if (Array.isArray(backupData)) {
    return backupData;
  }

  if (backupData && Array.isArray(backupData.memos)) {
    return backupData.memos;
  }

  throw new Error("올바른 SoloNote 백업 파일이 아닙니다.");
}

function importMemosFromBackup(backupData) {
  const importedMemos = extractMemosFromBackup(backupData).map(normalizeMemo);
  const currentMemos = getMemos();
  const currentIds = new Set(currentMemos.map((memo) => memo.id));

  const newMemos = [];
  let skippedCount = 0;

  importedMemos.forEach((memo) => {
    if (currentIds.has(memo.id)) {
      skippedCount += 1;
      return;
    }

    newMemos.push(memo);
    currentIds.add(memo.id);
  });

  saveMemos([...newMemos, ...currentMemos]);

  return {
    addedCount: newMemos.length,
    skippedCount,
    totalImportedCount: importedMemos.length,
  };
}
