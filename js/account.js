(() => {
  "use strict";

  const config = window.SOLONOTE_CONFIG || {};
  const REQUIRED_CONFIRMATION = "계정 삭제";
  const POST_AUTH_MESSAGE_KEY = "solonote_post_auth_message_v1";

  const openButton = document.querySelector("#openAccountDeletionButton");
  const modal = document.querySelector("#accountDeletionModal");
  const closeButton = document.querySelector("#closeAccountDeletionButton");
  const cancelButton = document.querySelector("#cancelAccountDeletionButton");
  const form = document.querySelector("#accountDeletionForm");
  const passwordInput = document.querySelector("#accountDeletionPassword");
  const confirmationInput = document.querySelector("#accountDeletionConfirmation");
  const confirmButton = document.querySelector("#confirmAccountDeletionButton");
  const status = document.querySelector("#accountDeletionStatus");
  const backupButton = document.querySelector("#backupBeforeDeleteButton");
  const existingBackupButton = document.querySelector("#backupButton");
  const appMenuCloseButton = document.querySelector("#appMenuCloseButton");

  let isDeleting = false;

  function setStatus(message = "", state = "") {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.className = "account-deletion-status";

    if (state) {
      status.dataset.state = state;
    } else {
      delete status.dataset.state;
    }
  }

  function setModalVisible(isVisible) {
    if (!modal) {
      return;
    }

    modal.hidden = !isVisible;
    modal.classList.toggle("hidden", !isVisible);
    modal.setAttribute("aria-hidden", String(!isVisible));
    document.body.classList.toggle("modal-open", isVisible);
  }

  function resetForm() {
    form?.reset();
    setStatus("");
    updateConfirmButton();
  }

  function openModal() {
    appMenuCloseButton?.click();
    resetForm();
    setModalVisible(true);
    window.setTimeout(() => passwordInput?.focus(), 30);
  }

  function closeModal() {
    if (isDeleting) {
      return;
    }

    setModalVisible(false);
    resetForm();
    openButton?.focus();
  }

  function updateConfirmButton() {
    if (!confirmButton) {
      return;
    }

    const hasPassword = Boolean(passwordInput?.value);
    const confirmationMatches = confirmationInput?.value === REQUIRED_CONFIRMATION;
    confirmButton.disabled = isDeleting || !hasPassword || !confirmationMatches;
  }

  function setDeletingState(active) {
    isDeleting = active;

    if (passwordInput) {
      passwordInput.disabled = active;
    }

    if (confirmationInput) {
      confirmationInput.disabled = active;
    }

    if (closeButton) {
      closeButton.disabled = active;
    }

    if (cancelButton) {
      cancelButton.disabled = active;
    }

    if (backupButton) {
      backupButton.disabled = active;
    }

    if (confirmButton) {
      confirmButton.textContent = active
        ? "계정 삭제 중..."
        : "계정과 데이터 영구 삭제";
    }

    updateConfirmButton();
  }

  function getProjectRef() {
    try {
      return new URL(config.supabaseUrl).hostname.split(".")[0] || "";
    } catch (error) {
      return "";
    }
  }

  function clearLocalSoloNoteData() {
    const projectRef = getProjectRef();
    const keysToRemove = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key) {
        continue;
      }

      if (
        key.startsWith("solonote_") ||
        (projectRef && key.startsWith(`sb-${projectRef}-auth-token`))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));

    if (typeof window.clearMemoCache === "function") {
      window.clearMemoCache();
    }
  }

  function translateDeletionError(error) {
    const message = String(error?.message || error || "");

    if (/invalid login credentials/i.test(message)) {
      return "현재 비밀번호가 올바르지 않습니다.";
    }

    if (/email not confirmed/i.test(message)) {
      return "이메일 인증이 완료되지 않은 계정입니다.";
    }

    if (/missing authorization|invalid jwt|session|unauthorized|401/i.test(message)) {
      return "로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도하세요.";
    }

    if (/failed to fetch|network|load failed/i.test(message)) {
      return "인터넷 연결 또는 계정 삭제 서버 연결 상태를 확인하세요.";
    }

    if (/function not found|404/i.test(message)) {
      return "계정 삭제 서버 함수가 아직 배포되지 않았습니다.";
    }

    return message || "계정을 삭제하지 못했습니다. 잠시 후 다시 시도하세요.";
  }

  async function invokeDeleteAccount(session) {
    const response = await window.fetch(
      `${config.supabaseUrl}/functions/v1/delete-account`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: config.supabasePublishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: REQUIRED_CONFIRMATION,
        }),
      }
    );

    let payload = {};

    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok || !payload.ok) {
      const failure = new Error(
        payload.error || payload.message || `계정 삭제 요청 실패 (${response.status})`
      );
      failure.status = response.status;
      throw failure;
    }

    return payload;
  }

  async function handleAccountDeletion(event) {
    event.preventDefault();

    if (isDeleting) {
      return;
    }

    const client = window.solonoteSupabase;
    const password = passwordInput?.value || "";
    const confirmation = confirmationInput?.value || "";

    if (!client) {
      setStatus("Supabase 연결이 준비되지 않았습니다.", "error");
      return;
    }

    if (!password) {
      setStatus("현재 비밀번호를 입력하세요.", "error");
      passwordInput?.focus();
      return;
    }

    if (confirmation !== REQUIRED_CONFIRMATION) {
      setStatus(`“${REQUIRED_CONFIRMATION}”를 정확히 입력하세요.`, "error");
      confirmationInput?.focus();
      return;
    }

    setDeletingState(true);
    setStatus("현재 비밀번호로 본인 확인 중입니다.", "info");

    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      const session = sessionData?.session;
      const email = session?.user?.email || "";

      if (sessionError) {
        throw sessionError;
      }

      if (!session || !email) {
        throw new Error("로그인 세션이 없습니다.");
      }

      const { error: reauthError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (reauthError) {
        throw reauthError;
      }

      const { data: refreshedData, error: refreshedError } = await client.auth.getSession();
      const refreshedSession = refreshedData?.session;

      if (refreshedError) {
        throw refreshedError;
      }

      if (!refreshedSession) {
        throw new Error("본인 확인 후 로그인 세션을 갱신하지 못했습니다.");
      }

      setStatus("클라우드 메모와 계정을 삭제하고 있습니다.", "info");
      await invokeDeleteAccount(refreshedSession);

      window.sessionStorage.setItem(
        POST_AUTH_MESSAGE_KEY,
        JSON.stringify({
          message: "SoloNote 계정과 데이터가 삭제되었습니다.",
          type: "success",
        })
      );

      try {
        await client.auth.signOut({ scope: "local" });
      } catch (error) {
        console.warn("로컬 로그아웃 정리 중 경고가 발생했습니다.", error);
      }

      clearLocalSoloNoteData();
      setStatus("계정 삭제가 완료되었습니다. 로그인 화면으로 이동합니다.", "success");
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      console.error("계정 삭제 실패", error);
      setStatus(translateDeletionError(error), "error");
      setDeletingState(false);
      passwordInput?.focus();
    }
  }

  openButton?.addEventListener("click", openModal);
  closeButton?.addEventListener("click", closeModal);
  cancelButton?.addEventListener("click", closeModal);
  passwordInput?.addEventListener("input", updateConfirmButton);
  confirmationInput?.addEventListener("input", updateConfirmButton);
  form?.addEventListener("submit", handleAccountDeletion);

  backupButton?.addEventListener("click", () => {
    existingBackupButton?.click();
    setStatus("백업 파일이 저장되었는지 확인한 뒤 삭제를 진행하세요.", "info");
  });

  modal?.addEventListener("click", (event) => {
    if (event.target?.dataset?.accountDeleteClose === "true") {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });
})();
