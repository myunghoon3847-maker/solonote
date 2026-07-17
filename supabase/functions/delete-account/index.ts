import { createClient } from "npm:@supabase/supabase-js@2";

const REQUIRED_CONFIRMATION = "계정 삭제";
const RECENT_PASSWORD_SECONDS = 5 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

type JwtAmrEntry = {
  method?: string;
  timestamp?: number;
};

type JwtPayload = {
  sub?: string;
  exp?: number;
  iat?: number;
  role?: string;
  amr?: JwtAmrEntry[];
};

type DeletionReadiness = {
  ready?: boolean;
  cascade_enabled?: boolean;
  memo_count?: number;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const normalized = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");

    return JSON.parse(atob(normalized)) as JwtPayload;
  } catch (_error) {
    return null;
  }
}

function hasRecentPasswordAuthentication(payload: JwtPayload, userId: string) {
  const now = Math.floor(Date.now() / 1000);

  if (
    payload.sub !== userId ||
    payload.role !== "authenticated" ||
    !payload.exp ||
    payload.exp <= now
  ) {
    return false;
  }

  const passwordEntries = Array.isArray(payload.amr)
    ? payload.amr.filter((entry) => entry?.method === "password")
    : [];

  return passwordEntries.some((entry) => {
    const timestamp = Number(entry.timestamp || 0);
    return (
      timestamp > 0 &&
      timestamp <= now + 60 &&
      now - timestamp <= RECENT_PASSWORD_SECONDS
    );
  });
}

function classifyAuthDeleteError(message: string) {
  if (/storage|object owner|owns.*object/i.test(message)) {
    return {
      code: "STORAGE_OBJECTS_EXIST",
      error: "계정이 소유한 저장소 파일이 남아 있어 삭제할 수 없습니다.",
    };
  }

  if (/foreign key|constraint|database error deleting user/i.test(message)) {
    return {
      code: "AUTH_DELETE_CONSTRAINT_FAILED",
      error: "계정과 연결된 데이터베이스 설정 때문에 삭제가 중단되었습니다.",
    };
  }

  return {
    code: "AUTH_DELETE_FAILED",
    error: "로그인 계정을 삭제하지 못했습니다.",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { ok: false, code: "METHOD_NOT_ALLOWED", error: "POST 요청만 허용됩니다." },
      405,
    );
  }

  const authorization = request.headers.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse(
      { ok: false, code: "MISSING_AUTHORIZATION", error: "로그인 인증 정보가 없습니다." },
      401,
    );
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey =
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !adminKey) {
    console.error("Account deletion configuration is incomplete.");
    return jsonResponse(
      { ok: false, code: "SERVER_CONFIGURATION_MISSING", error: "서버 설정이 완료되지 않았습니다." },
      500,
    );
  }

  let requestBody: { confirmation?: string } = {};

  try {
    requestBody = await request.json();
  } catch (_error) {
    return jsonResponse(
      { ok: false, code: "INVALID_REQUEST_BODY", error: "요청 형식이 올바르지 않습니다." },
      400,
    );
  }

  if (requestBody.confirmation !== REQUIRED_CONFIRMATION) {
    return jsonResponse(
      { ok: false, code: "CONFIRMATION_MISMATCH", error: "계정 삭제 확인 문구가 일치하지 않습니다." },
      400,
    );
  }

  const adminClient = createClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(accessToken);

  if (userError || !user) {
    console.warn("Account deletion rejected: invalid user token.");
    return jsonResponse(
      { ok: false, code: "INVALID_SESSION", error: "로그인 세션을 확인할 수 없습니다." },
      401,
    );
  }

  const jwtPayload = decodeJwtPayload(accessToken);

  // 클라이언트 화면의 비밀번호 입력만으로는 우회가 가능하므로,
  // 서버에서도 최근 5분 이내의 password 인증 기록을 확인합니다.
  if (!jwtPayload || !hasRecentPasswordAuthentication(jwtPayload, user.id)) {
    return jsonResponse(
      {
        ok: false,
        code: "RECENT_PASSWORD_AUTH_REQUIRED",
        error: "보안을 위해 현재 비밀번호로 다시 본인 확인한 뒤 삭제해야 합니다.",
      },
      403,
    );
  }

  // 실제 삭제 전에 FK가 ON DELETE CASCADE로 준비되었는지 서버에서 재검증합니다.
  // 이 확인을 통과하지 못하면 어떤 사용자 데이터도 삭제하지 않습니다.
  const { data: readinessRaw, error: readinessError } = await adminClient.rpc(
    "get_account_deletion_readiness",
    { target_user_id: user.id },
  );

  if (readinessError) {
    console.error("Account deletion readiness check failed.", readinessError.message);
    return jsonResponse(
      {
        ok: false,
        code: "ACCOUNT_DELETE_GUARD_UNAVAILABLE",
        error: "계정 삭제용 데이터베이스 안전 점검이 준비되지 않았습니다.",
      },
      503,
    );
  }

  const readiness = (Array.isArray(readinessRaw)
    ? readinessRaw[0]
    : readinessRaw) as DeletionReadiness | null;

  if (!readiness?.ready || !readiness?.cascade_enabled) {
    return jsonResponse(
      {
        ok: false,
        code: "ACCOUNT_DELETE_SCHEMA_NOT_READY",
        error: "계정 삭제용 데이터베이스 연결 설정이 완료되지 않았습니다.",
      },
      503,
    );
  }

  const expectedMemoCount = Number(readiness.memo_count || 0);

  // public.memos가 ON DELETE CASCADE로 연결되어 있으므로 Auth 사용자 삭제를
  // 한 번만 실행합니다. 삭제가 실패하면 DB 트랜잭션도 취소되어 메모가 유지됩니다.
  const { error: userDeleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
    false,
  );

  if (userDeleteError) {
    console.error("Failed to delete auth user.", userDeleteError.message);
    const classified = classifyAuthDeleteError(userDeleteError.message);
    return jsonResponse({ ok: false, ...classified }, 500);
  }

  // 정상이라면 CASCADE로 0개가 되어야 합니다. 혹시 남아 있으면 서비스 역할로
  // 한 번 더 정리하고 결과를 재확인합니다.
  const { count: remainingCount, error: countError } = await adminClient
    .from("memos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    console.error("Account deleted, but memo cleanup verification failed.", countError.message);
    return jsonResponse(
      {
        ok: false,
        code: "ACCOUNT_DELETED_VERIFICATION_FAILED",
        error: "계정은 삭제되었지만 서버 데이터 정리 결과를 확인하지 못했습니다.",
        accountDeleted: true,
        cleanupPending: true,
      },
      500,
    );
  }

  let cleanupMode = "cascade";

  if ((remainingCount || 0) > 0) {
    cleanupMode = "fallback";
    const { error: fallbackDeleteError } = await adminClient
      .from("memos")
      .delete()
      .eq("user_id", user.id);

    if (fallbackDeleteError) {
      console.error("Account deleted, but fallback memo cleanup failed.", fallbackDeleteError.message);
      return jsonResponse(
        {
          ok: false,
          code: "ACCOUNT_DELETED_CLEANUP_PENDING",
          error: "계정은 삭제되었지만 일부 서버 데이터 정리가 완료되지 않았습니다.",
          accountDeleted: true,
          cleanupPending: true,
        },
        500,
      );
    }

    const { count: finalCount, error: finalCountError } = await adminClient
      .from("memos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (finalCountError || (finalCount || 0) > 0) {
      console.error("Account deleted, but residual memos remain.");
      return jsonResponse(
        {
          ok: false,
          code: "ACCOUNT_DELETED_CLEANUP_PENDING",
          error: "계정은 삭제되었지만 일부 서버 데이터 정리가 완료되지 않았습니다.",
          accountDeleted: true,
          cleanupPending: true,
        },
        500,
      );
    }
  }

  return jsonResponse({
    ok: true,
    accountDeleted: true,
    deletedMemoCount: expectedMemoCount,
    cleanupMode,
  });
});
