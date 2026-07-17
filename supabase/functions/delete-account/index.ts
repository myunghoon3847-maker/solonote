const FUNCTION_VERSION = "4.3.2.4";
const REQUIRED_CONFIRMATION = "계정 삭제";
const RECENT_PASSWORD_SECONDS = 5 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
};

type JwtAmrEntry = {
  method?: string;
  timestamp?: number;
};

type JwtPayload = {
  sub?: string;
  exp?: number;
  role?: string;
  amr?: JwtAmrEntry[];
};

type DeletionReadiness = {
  ready?: boolean;
  cascade_enabled?: boolean;
  memo_count?: number;
};

function logStage(event: string, requestId: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    event,
    requestId,
    version: FUNCTION_VERSION,
    at: new Date().toISOString(),
    ...details,
  }));
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  requestId = "",
) {
  return Response.json(
    {
      ...body,
      requestId,
      functionVersion: FUNCTION_VERSION,
    },
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        ...(requestId ? { "X-Request-Id": requestId } : {}),
      },
    },
  );
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
  } catch {
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

export default {
  fetch: async (request: Request) => {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

    // 가장 먼저 응답합니다. 무거운 npm 모듈은 POST 요청에서만 불러옵니다.
    // 이 순서가 OPTIONS 요청의 504/546 오류를 방지하는 핵심입니다.
    if (request.method === "OPTIONS") {
      logStage("CORS_PREFLIGHT_OK", requestId);
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          "X-Request-Id": requestId,
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { ok: false, code: "METHOD_NOT_ALLOWED", error: "POST 요청만 허용됩니다." },
        405,
        requestId,
      );
    }

    logStage("DELETE_REQUEST_RECEIVED", requestId);

    try {
      const authorization = request.headers.get("Authorization") || "";

      if (!authorization.startsWith("Bearer ")) {
        return jsonResponse(
          { ok: false, code: "MISSING_AUTHORIZATION", error: "로그인 인증 정보가 없습니다." },
          401,
          requestId,
        );
      }

      const accessToken = authorization.slice("Bearer ".length).trim();
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const adminKey =
        Deno.env.get("SUPABASE_SECRET_KEY") ||
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !adminKey) {
        logStage("SERVER_CONFIGURATION_MISSING", requestId);
        return jsonResponse(
          { ok: false, code: "SERVER_CONFIGURATION_MISSING", error: "서버 설정이 완료되지 않았습니다." },
          500,
          requestId,
        );
      }

      let requestBody: { confirmation?: string } = {};

      try {
        requestBody = await request.json();
      } catch {
        return jsonResponse(
          { ok: false, code: "INVALID_REQUEST_BODY", error: "요청 형식이 올바르지 않습니다." },
          400,
          requestId,
        );
      }

      if (requestBody.confirmation !== REQUIRED_CONFIRMATION) {
        return jsonResponse(
          { ok: false, code: "CONFIRMATION_MISMATCH", error: "계정 삭제 확인 문구가 일치하지 않습니다." },
          400,
          requestId,
        );
      }

      logStage("RUNTIME_DEPENDENCY_LOADING", requestId);

      // OPTIONS 응답 후에만 로드해 사전 요청이 모듈 로딩 때문에 멈추지 않도록 합니다.
      const { createClient } = await import("npm:@supabase/supabase-js@2.95.0");

      logStage("RUNTIME_DEPENDENCY_READY", requestId);

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
        logStage("USER_AUTHENTICATION_FAILED", requestId, {
          message: userError?.message || "user not found",
        });
        return jsonResponse(
          { ok: false, code: "INVALID_SESSION", error: "로그인 세션을 확인할 수 없습니다." },
          401,
          requestId,
        );
      }

      logStage("USER_AUTHENTICATED", requestId, { userId: user.id });

      const jwtPayload = decodeJwtPayload(accessToken);

      if (!jwtPayload || !hasRecentPasswordAuthentication(jwtPayload, user.id)) {
        logStage("RECENT_PASSWORD_AUTH_REQUIRED", requestId, { userId: user.id });
        return jsonResponse(
          {
            ok: false,
            code: "RECENT_PASSWORD_AUTH_REQUIRED",
            error: "보안을 위해 현재 비밀번호로 다시 본인 확인한 뒤 삭제해야 합니다.",
          },
          403,
          requestId,
        );
      }

      logStage("RECENT_PASSWORD_AUTH_VERIFIED", requestId, { userId: user.id });

      const { data: readinessRaw, error: readinessError } = await adminClient.rpc(
        "get_account_deletion_readiness",
        { target_user_id: user.id },
      );

      if (readinessError) {
        logStage("DATABASE_GUARD_FAILED", requestId, {
          message: readinessError.message,
        });
        return jsonResponse(
          {
            ok: false,
            code: "ACCOUNT_DELETE_GUARD_UNAVAILABLE",
            error: "계정 삭제용 데이터베이스 안전 점검이 준비되지 않았습니다.",
          },
          503,
          requestId,
        );
      }

      const readiness = (Array.isArray(readinessRaw)
        ? readinessRaw[0]
        : readinessRaw) as DeletionReadiness | null;

      if (!readiness?.ready || !readiness?.cascade_enabled) {
        logStage("DATABASE_SCHEMA_NOT_READY", requestId, { readiness });
        return jsonResponse(
          {
            ok: false,
            code: "ACCOUNT_DELETE_SCHEMA_NOT_READY",
            error: "계정 삭제용 데이터베이스 연결 설정이 완료되지 않았습니다.",
          },
          503,
          requestId,
        );
      }

      const expectedMemoCount = Number(readiness.memo_count || 0);

      logStage("DATABASE_GUARD_VERIFIED", requestId, {
        userId: user.id,
        expectedMemoCount,
      });
      logStage("AUTH_DELETE_STARTED", requestId, { userId: user.id });

      const { error: userDeleteError } = await adminClient.auth.admin.deleteUser(
        user.id,
        false,
      );

      if (userDeleteError) {
        const classified = classifyAuthDeleteError(userDeleteError.message);
        logStage("AUTH_DELETE_FAILED", requestId, {
          userId: user.id,
          code: classified.code,
          message: userDeleteError.message,
        });
        return jsonResponse({ ok: false, ...classified }, 500, requestId);
      }

      logStage("AUTH_DELETE_COMPLETED", requestId, { userId: user.id });

      const { count: remainingCount, error: countError } = await adminClient
        .from("memos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        logStage("MEMO_VERIFICATION_FAILED", requestId, {
          userId: user.id,
          message: countError.message,
        });
        return jsonResponse(
          {
            ok: false,
            code: "ACCOUNT_DELETED_VERIFICATION_FAILED",
            error: "계정은 삭제되었지만 서버 데이터 정리 결과를 확인하지 못했습니다.",
            accountDeleted: true,
            cleanupPending: true,
          },
          500,
          requestId,
        );
      }

      let cleanupMode = "cascade";

      if ((remainingCount || 0) > 0) {
        cleanupMode = "fallback";
        logStage("MEMO_FALLBACK_CLEANUP_STARTED", requestId, {
          userId: user.id,
          remainingCount,
        });

        const { error: fallbackDeleteError } = await adminClient
          .from("memos")
          .delete()
          .eq("user_id", user.id);

        if (fallbackDeleteError) {
          logStage("MEMO_FALLBACK_CLEANUP_FAILED", requestId, {
            userId: user.id,
            message: fallbackDeleteError.message,
          });
          return jsonResponse(
            {
              ok: false,
              code: "ACCOUNT_DELETED_CLEANUP_PENDING",
              error: "계정은 삭제되었지만 일부 서버 데이터 정리가 완료되지 않았습니다.",
              accountDeleted: true,
              cleanupPending: true,
            },
            500,
            requestId,
          );
        }

        const { count: finalCount, error: finalCountError } = await adminClient
          .from("memos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (finalCountError || (finalCount || 0) > 0) {
          logStage("MEMO_RESIDUAL_DATA_FOUND", requestId, {
            userId: user.id,
            finalCount,
            message: finalCountError?.message || "residual memos remain",
          });
          return jsonResponse(
            {
              ok: false,
              code: "ACCOUNT_DELETED_CLEANUP_PENDING",
              error: "계정은 삭제되었지만 일부 서버 데이터 정리가 완료되지 않았습니다.",
              accountDeleted: true,
              cleanupPending: true,
            },
            500,
            requestId,
          );
        }
      }

      logStage("MEMO_CLEANUP_VERIFIED", requestId, {
        userId: user.id,
        cleanupMode,
      });
      logStage("DELETE_RESPONSE_SENT", requestId, { userId: user.id });

      return jsonResponse(
        {
          ok: true,
          accountDeleted: true,
          deletedMemoCount: expectedMemoCount,
          cleanupMode,
        },
        200,
        requestId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logStage("UNHANDLED_FUNCTION_ERROR", requestId, { message });
      return jsonResponse(
        {
          ok: false,
          code: "INTERNAL_FUNCTION_ERROR",
          error: "계정 삭제 서버에서 예상하지 못한 오류가 발생했습니다.",
        },
        500,
        requestId,
      );
    }
  },
};
