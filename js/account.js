(() => {
  "use strict";

  const config = window.SOLONOTE_CONFIG || {};
  const REQUIRED_CONFIRMATION = "계정 삭제";
  const POST_AUTH_MESSAGE_KEY = "solonote_post_auth_message_v1";
  const DELETE_REQUEST_TIMEOUT_MS = 45000;
  const DELETE_STATUS_RECHECK_DELAYS_MS = [0, 1200, 2500];

  const openButtons = Array.from(document.querySelectorAll("#openAccountDeletionButton"));
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

  function openModal(options = {}) {
    if (!options.skipHistory) {
      window.solonoteNavigation?.dismissMenu();
      window.solonoteNavigation?.openLayer("accountDeletion", {}, {
        replace: true,
      });
    }

    resetForm();
    setModalVisible(true);
    window.setTimeout(() => passwordInput?.focus(), 30);
  }

  function closeModal(options = {}) {
    if (isDeleting) {
      return;
    }

    if (
      !options.skipHistory &&
      window.solonoteNavigation?.closeLayer("accountDeletion")
    ) {
      return;
    }

    setModalVisible(false);
    resetForm();
    openButtons[0]?.focus();
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
    } catch (_error) {
      return "";
    }
  }

  function collectStorageKeys(storage, predicate) {
    const keys = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key && predicate(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  function clearLocal훈노트Data() {
    const projectRef = getProjectRef();
    const shouldRemoveLocalKey = (key) =>
      key.startsWith("solonote_") ||
      (projectRef && key.startsWith(`sb-${projectRef}-auth-token`));

    collectStorageKeys(window.localStorage, shouldRemoveLocalKey).forEach((key) => {
      window.localStorage.removeItem(key);
    });

    collectStorageKeys(window.sessionStorage, (key) => key.startsWith("solonote_")).forEach(
      (key) => {
        window.sessionStorage.removeItem(key);
      }
    );

    if (typeof window.clearMemoCache === "function") {
      window.clearMemoCache();
    }

    if (typeof window.clearMemoCategoryCache === "function") {
      window.clearMemoCategoryCache();
    }
  }

  function translateDeletionError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || error || "");

    const codeMessages = {
      RECENT_PASSWORD_AUTH_REQUIRED:
        "보안을 위해 현재 비밀번호로 다시 본인 확인해야 합니다. 비밀번호를 다시 입력하세요.",
      ACCOUNT_DELETE_GUARD_UNAVAILABLE:
        "계정 삭제용 데이터베이스 안전 점검이 아직 설치되지 않았습니다.",
      ACCOUNT_DELETE_SCHEMA_NOT_READY:
        "계정 삭제용 ON DELETE CASCADE 설정이 아직 완료되지 않았습니다.",
      SERVER_CONFIGURATION_MISSING:
        "계정 삭제 서버의 관리자 키 설정이 완료되지 않았습니다.",
      STORAGE_OBJECTS_EXIST:
        "계정이 소유한 저장소 파일이 남아 있어 삭제할 수 없습니다.",
      AUTH_DELETE_CONSTRAINT_FAILED:
        "계정과 연결된 데이터베이스 제약조건 때문에 삭제가 중단되었습니다.",
      ACCOUNT_DELETED_VERIFICATION_FAILED:
        "계정은 삭제되었지만 서버 데이터 정리 결과를 확인하지 못했습니다.",
      ACCOUNT_DELETED_CLEANUP_PENDING:
        "계정은 삭제되었지만 일부 서버 데이터 정리가 완료되지 않았습니다.",
      INTERNAL_FUNCTION_ERROR:
        "계정 삭제 서버 내부에서 오류가 발생했습니다. Supabase 함수 로그를 확인하세요.",
      EDGE_FUNCTION_TIMEOUT:
        "계정 삭제 서버의 응답 시간이 초과되었습니다. 계정 상태를 다시 확인했습니다.",
      USER_AUTH_CHECK_TIMEOUT:
        "로그인 사용자 확인 시간이 초과되었습니다. 잠시 후 다시 시도하세요.",
      DATABASE_GUARD_TIMEOUT:
        "계정 삭제 안전 점검 시간이 초과되었습니다. Supabase SQL 설정을 확인하세요.",
      AUTH_DELETE_TIMEOUT:
        "로그인 계정 삭제 시간이 초과되었습니다. 계정 상태를 다시 확인하세요.",
      INVALID_SESSION:
        "로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도하세요.",
    };

    if (codeMessages[code]) {
      return codeMessages[code];
    }

    if (/invalid login credentials/i.test(message)) {
      return "현재 비밀번호가 올바르지 않습니다.";
    }

    if (/email not confirmed/i.test(message)) {
      return "이메일 인증이 완료되지 않은 계정입니다.";
    }

    if (/missing authorization|invalid jwt|session|unauthorized|401/i.test(message)) {
      return "로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도하세요.";
    }

    if (/abort|timeout/i.test(message)) {
      return "계정 삭제 서버의 응답 시간이 초과되었습니다. 네트워크 상태를 확인하세요.";
    }

    if (/failed to fetch|network|load failed/i.test(message)) {
      return "인터넷 연결 또는 계정 삭제 서버 연결 상태를 확인하세요.";
    }

    if (/function not found|404/i.test(message)) {
      return "계정 삭제 서버 함수가 아직 배포되지 않았습니다.";
    }

    return message || "계정을 삭제하지 못했습니다. 잠시 후 다시 시도하세요.";
  }

  function sleep(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function confirmAccountWasDeleted(client) {
    for (const delay of DELETE_STATUS_RECHECK_DELAYS_MS) {
      if (delay > 0) {
        await sleep(delay);
      }

      try {
        const {
          data: { user },
          error,
        } = await client.auth.getUser();

        if (!user && (!error || error.status === 401 || error.status === 403)) {
          return true;
        }
      } catch (_error) {
        // 네트워크 오류는 삭제 성공으로 단정하지 않습니다.
      }
    }

    return false;
  }

  async function invokeDeleteAccount(session) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      DELETE_REQUEST_TIMEOUT_MS
    );
    const requestId = window.crypto?.randomUUID?.() || `solonote-${Date.now()}`;

    try {
      const response = await window.fetch(
        `${config.supabaseUrl}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: config.supabasePublishableKey,
            "Content-Type": "application/json",
            "X-Client-Info": "hoonnote-v4.5.12",
            "X-Request-Id": requestId,
          },
          body: JSON.stringify({
            confirmation: REQUIRED_CONFIRMATION,
            clientVersion: "4.5.12",
          }),
          cache: "no-store",
          signal: controller.signal,
        }
      );

      let payload = {};

      try {
        payload = await response.json();
      } catch (_error) {
        payload = {};
      }

      if (!response.ok || !payload.ok) {
        const failure = new Error(
          payload.error || payload.message || `계정 삭제 요청 실패 (${response.status})`
        );
        failure.status = response.status;
        failure.code = payload.code || "";
        failure.accountDeleted = Boolean(payload.accountDeleted);
        failure.cleanupPending = Boolean(payload.cleanupPending);
        failure.requestId = payload.requestId || response.headers.get("X-Request-Id") || requestId;
        throw failure;
      }

      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error(
          "계정 삭제 서버의 응답 시간이 초과되었습니다."
        );
        timeoutError.name = "AccountDeletionTimeoutError";
        timeoutError.code = "EDGE_FUNCTION_TIMEOUT";
        timeoutError.requestId = requestId;
        timeoutError.cause = error;
        throw timeoutError;
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function finishDeletionLocally(client, message, messageType = "success") {
    try {
      await client.auth.signOut({ scope: "local" });
    } catch (error) {
      console.warn("로컬 로그아웃 정리 중 경고가 발생했습니다.", error);
    }

    clearLocal훈노트Data();

    window.sessionStorage.setItem(
      POST_AUTH_MESSAGE_KEY,
      JSON.stringify({ message, type: messageType })
    );

    setStatus("계정 삭제 처리를 마쳤습니다. 로그인 화면으로 이동합니다.", "success");
    window.setTimeout(() => window.location.reload(), 350);
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
      const {
        data: { user: currentUser },
        error: currentUserError,
      } = await client.auth.getUser();

      if (currentUserError) {
        throw currentUserError;
      }

      if (!currentUser?.id || !currentUser.email) {
        throw new Error("로그인 세션이 없습니다.");
      }

      const { data: reauthData, error: reauthError } = await client.auth.signInWithPassword({
        email: currentUser.email,
        password,
      });

      if (reauthError) {
        throw reauthError;
      }

      if (!reauthData?.user || reauthData.user.id !== currentUser.id) {
        throw new Error("본인 확인한 계정이 현재 로그인 계정과 일치하지 않습니다.");
      }

      const refreshedSession = reauthData.session;

      if (!refreshedSession?.access_token) {
        throw new Error("본인 확인 후 로그인 세션을 갱신하지 못했습니다.");
      }

      setStatus("계정과 클라우드 데이터를 안전하게 삭제하고 있습니다.", "info");
      await invokeDeleteAccount(refreshedSession);

      await finishDeletionLocally(
        client,
        "훈노트 계정과 데이터가 삭제되었습니다.",
        "success"
      );
    } catch (error) {
      console.error("계정 삭제 실패", error);

      if (error?.accountDeleted) {
        await finishDeletionLocally(
          client,
          "계정은 삭제되었지만 일부 서버 데이터 정리 상태를 확인해야 합니다.",
          "info"
        );
        return;
      }

      if (error?.code === "EDGE_FUNCTION_TIMEOUT") {
        setStatus("서버 응답이 늦어 계정 삭제 결과를 다시 확인하고 있습니다.", "info");
        const accountDeleted = await confirmAccountWasDeleted(client);

        if (accountDeleted) {
          await finishDeletionLocally(
            client,
            "훈노트 계정과 데이터가 삭제되었습니다.",
            "success"
          );
          return;
        }
      }

      setStatus(translateDeletionError(error), "error");
      setDeletingState(false);
      passwordInput?.focus();
    }
  }

  openButtons.forEach((button) => button.addEventListener("click", openModal));
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

  window.addEventListener("solonote-navigation-sync", (event) => {
    const shouldBeOpen = event.detail?.layer === "accountDeletion";

    if (shouldBeOpen && modal?.hidden) {
      openModal({ skipHistory: true });
      return;
    }

    if (!shouldBeOpen && modal && !modal.hidden) {
      closeModal({ skipHistory: true });
    }
  });
})();
