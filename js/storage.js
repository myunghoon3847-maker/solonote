const LEGACY_STORAGE_KEY = "solonote_memos_v1";

let memoCache = [];
let cloudMemosLoaded = false;

function createSafeId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeTask(task) {
  return {
    id: task && task.id ? String(task.id) : createSafeId("task"),
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
  const now = new Date().toISOString();

  return {
    ...memo,
    id: memo && memo.id ? String(memo.id) : createSafeId("memo"),
    title: memo && typeof memo.title === "string" ? memo.title : "제목 없음",
    content: memo && typeof memo.content === "string" ? memo.content : "",
    category: memo && typeof memo.category === "string" ? memo.category : "업무",
    project: normalizeProject(memo && memo.project),
    createdAt: (memo && (memo.createdAt || memo.created_at)) || now,
    updatedAt:
      (memo && (memo.updatedAt || memo.updated_at || memo.createdAt || memo.created_at)) ||
      now,
    isArchived:
      memo && memo.isArchived !== undefined
        ? Boolean(memo.isArchived)
        : Boolean(memo && memo.category === "보관"),
    isDeleted:
      memo && memo.isDeleted !== undefined
        ? Boolean(memo.isDeleted)
        : Boolean(memo && memo.is_deleted),
    isImportant:
      memo && memo.isImportant !== undefined
        ? Boolean(memo.isImportant)
        : Boolean(memo && memo.is_important),
    tasks: normalizeTasks(memo && memo.tasks),
  };
}

function mapDatabaseRowToMemo(row) {
  return normalizeMemo({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    project: row.project,
    isImportant: row.is_important,
    isDeleted: row.is_deleted,
    tasks: row.tasks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function getMemos() {
  return memoCache;
}

function clearMemoCache() {
  memoCache = [];
  cloudMemosLoaded = false;
}

function hasLoadedCloudMemos() {
  return cloudMemosLoaded;
}

function getLegacyMemoCount() {
  const savedMemos = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!savedMemos) {
    return 0;
  }

  try {
    const parsed = JSON.parse(savedMemos);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (error) {
    return 0;
  }
}


function getLegacyMemos() {
  const savedMemos = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!savedMemos) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedMemos);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeMemo);
  } catch (error) {
    console.error("기존 브라우저 메모를 읽지 못했습니다.", error);
    return [];
  }
}

function hasLegacyMemoData() {
  return getLegacyMemos().length > 0;
}

async function importLegacyMemosToCloud() {
  const legacyMemos = getLegacyMemos();

  if (legacyMemos.length === 0) {
    return {
      addedCount: 0,
      skippedCount: 0,
      totalImportedCount: 0,
      source: "localStorage",
    };
  }

  const result = await importMemosFromBackup({
    app: "SoloNote",
    backupVersion: "legacy-localStorage",
    storage: "localStorage",
    exportedAt: new Date().toISOString(),
    memos: legacyMemos,
  });

  return {
    ...result,
    source: "localStorage",
  };
}

async function getCloudContext() {
  const client = window.solonoteSupabase;

  if (!client) {
    throw new Error("Supabase 클라이언트가 준비되지 않았습니다.");
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  const session = data && data.session;

  if (!session || !session.user) {
    throw new Error("로그인 세션이 없습니다. 다시 로그인해주세요.");
  }

  return {
    client,
    session,
    user: session.user,
  };
}

function toDatabasePayload(memoData, userId) {
  return {
    user_id: userId,
    title: typeof memoData.title === "string" ? memoData.title : "",
    content: typeof memoData.content === "string" ? memoData.content : "",
    category: typeof memoData.category === "string" ? memoData.category : "업무",
    project: normalizeProject(memoData.project),
    is_important: Boolean(memoData.isImportant),
    is_deleted: Boolean(memoData.isDeleted),
    tasks: normalizeTasks(memoData.tasks),
  };
}

function sortCacheByUpdatedDate() {
  memoCache.sort((a, b) => {
    return new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime();
  });
}

async function loadMemosFromCloud() {
  const { client } = await getCloudContext();

  const { data, error } = await client
    .from("memos")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  memoCache = (data || []).map(mapDatabaseRowToMemo);
  cloudMemosLoaded = true;

  return memoCache;
}

async function addMemo(memoData) {
  const { client, user } = await getCloudContext();

  const payload = toDatabasePayload(
    {
      ...memoData,
      isDeleted: false,
    },
    user.id
  );

  const { data, error } = await client
    .from("memos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const newMemo = mapDatabaseRowToMemo(data);
  memoCache.unshift(newMemo);

  return newMemo;
}

async function updateMemo(id, updatedData) {
  const { client, user } = await getCloudContext();

  const payload = toDatabasePayload(
    {
      ...updatedData,
      isDeleted: Boolean(updatedData.isDeleted),
    },
    user.id
  );

  delete payload.user_id;
  delete payload.is_deleted;

  const { data, error } = await client
    .from("memos")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const updatedMemo = mapDatabaseRowToMemo(data);
  memoCache = memoCache.map((memo) => (memo.id === id ? updatedMemo : memo));
  sortCacheByUpdatedDate();

  return updatedMemo;
}

async function setMemoDeletedState(id, isDeleted) {
  const { client, user } = await getCloudContext();

  const { data, error } = await client
    .from("memos")
    .update({ is_deleted: Boolean(isDeleted) })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const updatedMemo = mapDatabaseRowToMemo(data);
  memoCache = memoCache.map((memo) => (memo.id === id ? updatedMemo : memo));
  sortCacheByUpdatedDate();

  return updatedMemo;
}

async function moveMemoToTrash(id) {
  return setMemoDeletedState(id, true);
}

async function restoreMemo(id) {
  return setMemoDeletedState(id, false);
}

async function permanentlyDeleteMemo(id) {
  const { client, user } = await getCloudContext();

  const { error } = await client
    .from("memos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  memoCache = memoCache.filter((memo) => memo.id !== id);
}

async function toggleTaskDone(memoId, taskId) {
  const memo = findMemoById(memoId);

  if (!memo) {
    return null;
  }

  const tasks = memo.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      done: !task.done,
    };
  });

  return updateMemo(memoId, {
    title: memo.title,
    content: memo.content,
    category: memo.category,
    project: memo.project,
    isImportant: memo.isImportant,
    tasks,
  });
}

function findMemoById(id) {
  return memoCache.find((memo) => memo.id === id);
}

function getActiveMemoCount() {
  return memoCache.filter((memo) => !memo.isDeleted).length;
}

function getProjectOptions() {
  const projects = memoCache
    .filter((memo) => !memo.isDeleted)
    .map((memo) => normalizeProject(memo.project))
    .filter(Boolean);

  return [...new Set(projects)].sort((a, b) => a.localeCompare(b, "ko-KR"));
}

function createBackupData() {
  return {
    app: "SoloNote",
    backupVersion: "3.5",
    storage: "supabase",
    exportedAt: new Date().toISOString(),
    memos: memoCache,
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

function normalizeTextForSignature(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function normalizeDateForSignature(value) {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizeTextForSignature(value);
  }

  return parsedDate.toISOString();
}

function normalizeTasksForSignature(tasks) {
  if (!Array.isArray(tasks)) {
    return "[]";
  }

  return JSON.stringify(
    tasks.map((task) => ({
      text: normalizeTextForSignature(task && task.text),
      done: Boolean(task && task.done),
    }))
  );
}

function createMemoSignature(memo) {
  return [
    normalizeTextForSignature(memo.title),
    normalizeTextForSignature(memo.content),
    normalizeTextForSignature(memo.category),
    normalizeTextForSignature(memo.project),
    normalizeDateForSignature(memo.createdAt),
    String(Boolean(memo.isImportant)),
    String(Boolean(memo.isDeleted)),
    normalizeTasksForSignature(memo.tasks),
  ].join("\u241f");
}

async function importMemosFromBackup(backupData) {
  const importedMemos = extractMemosFromBackup(backupData).map(normalizeMemo);
  const { client, user } = await getCloudContext();

  const existingSignatures = new Set(
    memoCache.map((memo) => createMemoSignature(normalizeMemo(memo)))
  );
  const memosToInsert = [];
  let skippedCount = 0;

  importedMemos.forEach((memo) => {
    const normalizedMemo = normalizeMemo(memo);
    const signature = createMemoSignature(normalizedMemo);

    if (existingSignatures.has(signature)) {
      skippedCount += 1;
      return;
    }

    existingSignatures.add(signature);
    memosToInsert.push({
      ...toDatabasePayload(normalizedMemo, user.id),
      created_at: normalizedMemo.createdAt,
      updated_at: normalizedMemo.updatedAt,
    });
  });

  if (memosToInsert.length === 0) {
    return {
      addedCount: 0,
      skippedCount,
      totalImportedCount: importedMemos.length,
    };
  }

  const { data, error } = await client
    .from("memos")
    .insert(memosToInsert)
    .select();

  if (error) {
    throw error;
  }

  const addedMemos = (data || []).map(mapDatabaseRowToMemo);
  memoCache = [...addedMemos, ...memoCache];
  sortCacheByUpdatedDate();

  return {
    addedCount: addedMemos.length,
    skippedCount,
    totalImportedCount: importedMemos.length,
  };
}

function getDataStats() {
  const trashCount = memoCache.filter((memo) => memo.isDeleted).length;

  return {
    totalCount: memoCache.length,
    activeCount: memoCache.length - trashCount,
    trashCount,
  };
}

async function emptyTrash() {
  const { client, user } = await getCloudContext();
  const deletedCount = memoCache.filter((memo) => memo.isDeleted).length;

  if (deletedCount === 0) {
    return 0;
  }

  const { error } = await client
    .from("memos")
    .delete()
    .eq("user_id", user.id)
    .eq("is_deleted", true);

  if (error) {
    throw error;
  }

  memoCache = memoCache.filter((memo) => !memo.isDeleted);

  return deletedCount;
}

async function resetAllData() {
  const { client, user } = await getCloudContext();
  const deletedCount = memoCache.length;

  if (deletedCount === 0) {
    return 0;
  }

  const { error } = await client
    .from("memos")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  memoCache = [];

  return deletedCount;
}
