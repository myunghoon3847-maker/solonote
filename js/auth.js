(() => {
  "use strict";

  const config = window.SOLONOTE_CONFIG || {};
  const authScreen = document.querySelector("#authScreen");
  const authTitle = document.querySelector("#authTitle");
  const authDescription = document.querySelector("#authDescription");
  const authLoading = document.querySelector("#authLoading");
  const loginForm = document.querySelector("#loginForm");
  const loginEmail = document.querySelector("#loginEmail");
  const loginPassword = document.querySelector("#loginPassword");
  const loginButton = document.querySelector("#loginButton");
  const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
  const resetRequestForm = document.querySelector("#resetRequestForm");
  const resetEmail = document.querySelector("#resetEmail");
  const resetRequestButton = document.querySelector("#resetRequestButton");
  const backToLoginButton = document.querySelector("#backToLoginButton");
  const passwordRecoveryForm = document.querySelector("#passwordRecoveryForm");
  const newPassword = document.querySelector("#newPassword");
  const confirmNewPassword = document.querySelector("#confirmNewPassword");
  const updatePasswordButton = document.querySelector("#updatePasswordButton");
  const authMessage = document.querySelector("#authMessage");
  const authNote = document.querySelector("#authNote");
  const appShell = document.querySelector("#appShell");
  const signedInEmail = document.querySelector("#signedInEmail");
  const logoutButton = document.querySelector("#logoutButton");

  let client = null;
  let isPasswordRecovery = false;
  let pendingLoginMessage = "";
  let pendingLoginMessageType = "";
  const recoveryUrlHint = hasPasswordRecoveryHint();

  window.solonotePasswordRecoveryActive = false;

  function notifyAuthChange(session) {
    window.solonoteCurrentSession = session || null;
    window.dispatchEvent(
      new CustomEvent("solonote-auth-changed", {
        detail: { session: session || null },
      })
    );
  }

  function hasPasswordRecoveryHint() {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    return (
      query.get("type") === "recovery" ||
      hash.get("type") === "recovery" ||
      query.has("token_hash") ||
      hash.has("access_token")
    );
  }

  function getRecoveryUrlError() {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    return (
      query.get("error_description") ||
      hash.get("error_description") ||
      ""
    ).replace(/\+/g, " ");
  }

  function getPasswordResetRedirectUrl() {
    return new URL("./", window.location.href).href;
  }

  function cleanAuthParametersFromUrl() {
    const url = new URL(window.location.href);
    const authKeys = [
      "code",
      "token",
      "token_hash",
      "type",
      "error",
      "error_code",
      "error_description",
    ];

    authKeys.forEach((key) => url.searchParams.delete(key));
    url.hash = "";

    window.history.replaceState({}, document.title, url.toString());
  }

  function setMessage(message = "", type = "") {
    if (!authMessage) {
      return;
    }

    authMessage.textContent = message;
    authMessage.className = "auth-message";

    if (type) {
      authMessage.classList.add(`auth-message-${type}`);
    }
  }

  function setButtonBusy(button, isBusy, busyText, normalText) {
    if (!button) {
      return;
    }

    button.disabled = isBusy;
    button.textContent = isBusy ? busyText : normalText;
  }

  function setElementVisible(element, isVisible) {
    if (!element) {
      return;
    }

    element.classList.toggle("hidden", !isVisible);
    element.hidden = !isVisible;
    element.setAttribute("aria-hidden", String(!isVisible));
  }

  function hideAuthForms() {
    setElementVisible(authLoading, false);
    setElementVisible(loginForm, false);
    setElementVisible(resetRequestForm, false);
    setElementVisible(passwordRecoveryForm, false);
  }

  function showAuthContainer() {
    document.body.classList.remove("auth-pending", "auth-logged-in");
    document.body.classList.add("auth-logged-out");

    if (authScreen) {
      authScreen.hidden = false;
      authScreen.setAttribute("aria-hidden", "false");
    }

    if (appShell) {
      appShell.hidden = true;
      appShell.setAttribute("aria-hidden", "true");
    }
  }

  function setAuthCopy(title, description, note) {
    if (authTitle) {
      authTitle.textContent = title;
    }

    if (authDescription) {
      authDescription.textContent = description;
    }

    if (authNote) {
      authNote.textContent = note;
    }
  }

  function showLoginScreen(message = "", messageType = "") {
    isPasswordRecovery = false;
    window.solonotePasswordRecoveryActive = false;

    showAuthContainer();
    hideAuthForms();
    setElementVisible(loginForm, true);

    setAuthCopy(
      "SoloNote",
      "등록해둔 내 계정으로 로그인하세요.",
      "이 화면에는 회원가입 기능이 없습니다. Supabase에 미리 만든 본인 계정만 로그인할 수 있습니다."
    );

    if (signedInEmail) {
      signedInEmail.textContent = "로그인 필요";
    }

    if (loginPassword) {
      loginPassword.value = "";
    }

    setMessage(message, messageType);
    notifyAuthChange(null);
  }

  function showResetRequestScreen() {
    isPasswordRecovery = false;
    window.solonotePasswordRecoveryActive = false;

    showAuthContainer();
    hideAuthForms();
    setElementVisible(resetRequestForm, true);

    setAuthCopy(
      "비밀번호 재설정",
      "등록한 이메일로 재설정 링크를 보내드립니다.",
      "메일이 보이지 않으면 스팸함을 확인하세요. 보안을 위해 계정 존재 여부는 별도로 표시하지 않습니다."
    );

    if (resetEmail && loginEmail?.value.trim()) {
      resetEmail.value = loginEmail.value.trim();
    }

    setMessage("");
    resetEmail?.focus();
    notifyAuthChange(null);
  }

  function showPasswordRecoveryScreen(session, message = "") {
    isPasswordRecovery = true;
    window.solonotePasswordRecoveryActive = true;
    window.solonoteCurrentSession = session || null;

    showAuthContainer();
    hideAuthForms();
    setElementVisible(passwordRecoveryForm, true);

    setAuthCopy(
      "새 비밀번호 설정",
      "이메일 인증이 확인되었습니다.",
      "새 비밀번호는 8자 이상으로 설정하세요. 완료 후 새 비밀번호로 다시 로그인합니다."
    );

    if (newPassword) {
      newPassword.value = "";
    }

    if (confirmNewPassword) {
      confirmNewPassword.value = "";
    }

    setMessage(message || "새 비밀번호를 입력하세요.", "info");
    newPassword?.focus();
    notifyAuthChange(null);
  }

  function showApp(session) {
    if (isPasswordRecovery || window.solonotePasswordRecoveryActive) {
      showPasswordRecoveryScreen(session);
      return;
    }

    document.body.classList.remove("auth-pending", "auth-logged-out");
    document.body.classList.add("auth-logged-in");

    hideAuthForms();

    if (authScreen) {
      authScreen.hidden = true;
      authScreen.setAttribute("aria-hidden", "true");
    }

    if (appShell) {
      appShell.hidden = false;
      appShell.setAttribute("aria-hidden", "false");
    }

    const email = session?.user?.email || "로그인된 사용자";

    if (signedInEmail) {
      signedInEmail.textContent = email;
      signedInEmail.title = email;
    }

    if (loginPassword) {
      loginPassword.value = "";
    }

    setMessage("");
    notifyAuthChange(session);
  }

  function translateAuthError(error) {
    const message = String(error?.message || "");

    if (/invalid login credentials/i.test(message)) {
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    }

    if (/email not confirmed/i.test(message)) {
      return "이메일 인증이 완료되지 않았습니다. Supabase 사용자 상태를 확인하세요.";
    }

    if (/rate limit|too many requests|email rate limit/i.test(message)) {
      return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
    }

    if (/same password|different from the old password/i.test(message)) {
      return "기존 비밀번호와 다른 새 비밀번호를 입력하세요.";
    }

    if (/password.*(least|characters|weak)|weak password/i.test(message)) {
      return "더 안전한 비밀번호를 입력하세요. 최소 8자 이상을 권장합니다.";
    }

    if (/session.*missing|invalid.*token|token.*expired|otp.*expired/i.test(message)) {
      return "재설정 링크가 만료되었거나 올바르지 않습니다. 새 링크를 다시 요청하세요.";
    }

    if (/failed to fetch|network/i.test(message)) {
      return "인터넷 연결 또는 Supabase 연결 상태를 확인하세요.";
    }

    return message || "인증 처리 중 오류가 발생했습니다.";
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!client) {
      showLoginScreen("Supabase 연결을 초기화하지 못했습니다.", "error");
      return;
    }

    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value || "";

    if (!email || !password) {
      setMessage("이메일과 비밀번호를 모두 입력하세요.", "error");
      return;
    }

    setButtonBusy(loginButton, true, "로그인 중...", "로그인");
    setMessage("로그인 정보를 확인하고 있습니다.", "info");

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("로그인 세션을 만들지 못했습니다.");
      }

      showApp(data.session);
    } catch (error) {
      showLoginScreen(translateAuthError(error), "error");
      loginPassword?.focus();
    } finally {
      setButtonBusy(loginButton, false, "로그인 중...", "로그인");
    }
  }

  async function handleResetRequest(event) {
    event.preventDefault();

    if (!client) {
      setMessage("Supabase 연결을 초기화하지 못했습니다.", "error");
      return;
    }

    const email = resetEmail?.value.trim() || "";

    if (!email) {
      setMessage("재설정 이메일을 받을 주소를 입력하세요.", "error");
      resetEmail?.focus();
      return;
    }

    setButtonBusy(
      resetRequestButton,
      true,
      "이메일 보내는 중...",
      "재설정 이메일 보내기"
    );
    setMessage("재설정 이메일을 요청하고 있습니다.", "info");

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      setMessage(
        "등록된 계정이라면 재설정 이메일을 보냈습니다. 받은 메일의 링크를 눌러주세요.",
        "success"
      );
    } catch (error) {
      setMessage(translateAuthError(error), "error");
    } finally {
      setButtonBusy(
        resetRequestButton,
        false,
        "이메일 보내는 중...",
        "재설정 이메일 보내기"
      );
    }
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();

    if (!client) {
      setMessage("Supabase 연결을 초기화하지 못했습니다.", "error");
      return;
    }

    const password = newPassword?.value || "";
    const passwordConfirm = confirmNewPassword?.value || "";

    if (password.length < 8) {
      setMessage("새 비밀번호는 8자 이상으로 입력하세요.", "error");
      newPassword?.focus();
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.", "error");
      confirmNewPassword?.focus();
      return;
    }

    setButtonBusy(
      updatePasswordButton,
      true,
      "비밀번호 저장 중...",
      "새 비밀번호 저장"
    );
    setMessage("새 비밀번호를 저장하고 있습니다.", "info");

    try {
      const { error } = await client.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      cleanAuthParametersFromUrl();
      isPasswordRecovery = false;
      window.solonotePasswordRecoveryActive = false;
      pendingLoginMessage =
        "비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.";
      pendingLoginMessageType = "success";

      const { error: signOutError } = await client.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      if (pendingLoginMessage) {
        const message = pendingLoginMessage;
        const messageType = pendingLoginMessageType;
        pendingLoginMessage = "";
        pendingLoginMessageType = "";
        showLoginScreen(message, messageType);
      }
    } catch (error) {
      setMessage(translateAuthError(error), "error");
    } finally {
      setButtonBusy(
        updatePasswordButton,
        false,
        "비밀번호 저장 중...",
        "새 비밀번호 저장"
      );
    }
  }

  async function handleLogout() {
    if (!client || !logoutButton) {
      return;
    }

    const beforeLogoutEvent = new CustomEvent("solonote-before-logout", {
      cancelable: true,
    });

    if (!window.dispatchEvent(beforeLogoutEvent)) {
      return;
    }

    const originalText = logoutButton.textContent;
    logoutButton.disabled = true;
    logoutButton.textContent = "로그아웃 중...";

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        throw error;
      }

      showLoginScreen("로그아웃했습니다.", "info");
    } catch (error) {
      alert(`로그아웃하지 못했습니다.\n${translateAuthError(error)}`);
    } finally {
      logoutButton.disabled = false;
      logoutButton.textContent = originalText;
    }
  }

  async function initializeAuth() {
    hideAuthForms();
    setElementVisible(authLoading, true);

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showLoginScreen(
        "Supabase 로그인 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 새로고침하세요.",
        "error"
      );
      return;
    }

    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      showLoginScreen("Supabase 연결 정보가 설정되지 않았습니다.", "error");
      return;
    }

    client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );

    window.solonoteSupabase = client;

    loginForm?.addEventListener("submit", handleLogin);
    forgotPasswordButton?.addEventListener("click", showResetRequestScreen);
    resetRequestForm?.addEventListener("submit", handleResetRequest);
    backToLoginButton?.addEventListener("click", () => showLoginScreen());
    passwordRecoveryForm?.addEventListener("submit", handlePasswordUpdate);
    logoutButton?.addEventListener("click", handleLogout);

    client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        showPasswordRecoveryScreen(session);
        return;
      }

      if (event === "SIGNED_OUT") {
        if (pendingLoginMessage) {
          const message = pendingLoginMessage;
          const messageType = pendingLoginMessageType;
          pendingLoginMessage = "";
          pendingLoginMessageType = "";
          showLoginScreen(message, messageType);
        } else {
          showLoginScreen("로그아웃했습니다.", "info");
        }
        return;
      }

      if (session) {
        if (
          isPasswordRecovery ||
          window.solonotePasswordRecoveryActive ||
          recoveryUrlHint
        ) {
          showPasswordRecoveryScreen(session);
        } else {
          showApp(session);
        }
        return;
      }

      showLoginScreen();
    });

    try {
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        if (recoveryUrlHint) {
          showPasswordRecoveryScreen(data.session);
        } else {
          showApp(data.session);
        }
      } else if (recoveryUrlHint || getRecoveryUrlError()) {
        showLoginScreen(
          getRecoveryUrlError() ||
            "재설정 링크가 만료되었거나 올바르지 않습니다. 새 링크를 다시 요청하세요.",
          "error"
        );
      } else {
        showLoginScreen();
      }
    } catch (error) {
      showLoginScreen(translateAuthError(error), "error");
    }
  }

  initializeAuth();
})();
