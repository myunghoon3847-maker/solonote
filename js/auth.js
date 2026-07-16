(() => {
  "use strict";

  const config = window.SOLONOTE_CONFIG || {};
  const authScreen = document.querySelector("#authScreen");
  const authLoading = document.querySelector("#authLoading");
  const loginForm = document.querySelector("#loginForm");
  const loginEmail = document.querySelector("#loginEmail");
  const loginPassword = document.querySelector("#loginPassword");
  const loginButton = document.querySelector("#loginButton");
  const authMessage = document.querySelector("#authMessage");
  const appShell = document.querySelector("#appShell");
  const signedInEmail = document.querySelector("#signedInEmail");
  const logoutButton = document.querySelector("#logoutButton");

  let client = null;

  function notifyAuthChange(session) {
    window.solonoteCurrentSession = session || null;
    window.dispatchEvent(
      new CustomEvent("solonote-auth-changed", {
        detail: { session: session || null },
      })
    );
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

  function setLoginBusy(isBusy) {
    if (!loginButton) {
      return;
    }

    loginButton.disabled = isBusy;
    loginButton.textContent = isBusy ? "로그인 중..." : "로그인";
  }

  function showLoginScreen(message = "") {
    document.body.classList.remove("auth-pending", "auth-logged-in");
    document.body.classList.add("auth-logged-out");

    authLoading?.classList.add("hidden");
    loginForm?.classList.remove("hidden");

    if (authScreen) {
      authScreen.hidden = false;
      authScreen.setAttribute("aria-hidden", "false");
    }

    if (appShell) {
      appShell.hidden = true;
      appShell.setAttribute("aria-hidden", "true");
    }

    if (signedInEmail) {
      signedInEmail.textContent = "로그인 필요";
    }

    setMessage(message, message ? "error" : "");
    notifyAuthChange(null);
  }

  function showApp(session) {
    document.body.classList.remove("auth-pending", "auth-logged-out");
    document.body.classList.add("auth-logged-in");

    authLoading?.classList.add("hidden");
    loginForm?.classList.add("hidden");

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

    if (/failed to fetch|network/i.test(message)) {
      return "인터넷 연결 또는 Supabase 연결 상태를 확인하세요.";
    }

    return message || "로그인 중 오류가 발생했습니다.";
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!client) {
      showLoginScreen("Supabase 연결을 초기화하지 못했습니다.");
      return;
    }

    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value || "";

    if (!email || !password) {
      setMessage("이메일과 비밀번호를 모두 입력하세요.", "error");
      return;
    }

    setLoginBusy(true);
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
      showLoginScreen(translateAuthError(error));
      loginPassword?.focus();
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    if (!client || !logoutButton) {
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

      showLoginScreen("로그아웃했습니다.");
    } catch (error) {
      alert(`로그아웃하지 못했습니다.\n${translateAuthError(error)}`);
    } finally {
      logoutButton.disabled = false;
      logoutButton.textContent = originalText;
    }
  }

  async function initializeAuth() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showLoginScreen("Supabase 로그인 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 새로고침하세요.");
      return;
    }

    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      showLoginScreen("Supabase 연결 정보가 설정되지 않았습니다.");
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
    logoutButton?.addEventListener("click", handleLogout);

    client.auth.onAuthStateChange((event, session) => {
      if (session) {
        showApp(session);
      } else if (event === "SIGNED_OUT") {
        showLoginScreen("로그아웃했습니다.");
      } else {
        showLoginScreen();
      }
    });

    try {
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        showApp(data.session);
      } else {
        showLoginScreen();
      }
    } catch (error) {
      showLoginScreen(translateAuthError(error));
    }
  }

  initializeAuth();
})();
