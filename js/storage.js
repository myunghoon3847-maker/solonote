const STORAGE_KEY = "solonote_memos_v1";

function normalizeMemo(memo) {
  return {
    ...memo,
    isArchived: memo.isArchived ?? memo.category === "보관",
    isDeleted: memo.isDeleted ?? false,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

function createMemo({ title, content, category }) {
  const now = new Date().toISOString();

  return {
    id: `memo_${Date.now()}`,
    title,
    content,
    category,
    createdAt: now,
    updatedAt: now,
    isArchived: category === "보관",
    isDeleted: false,
  };
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

    return {
      ...memo,
      ...updatedData,
      isArchived: updatedData.category === "보관",
      updatedAt: new Date().toISOString(),
    };
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

function findMemoById(id) {
  return getMemos().find((memo) => memo.id === id);
}

function getActiveMemoCount() {
  return getMemos().filter((memo) => !memo.isDeleted).length;
}
