const FUNCTION_VERSION = "4.3.2.6";
const REQUIRED_CONFIRMATION = "계정 삭제";
const RECENT_PASSWORD_SECONDS = 5 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
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

type AuthUser = {
  id?: string;
  email?: string;
};

type DeletionReadiness = {
  ready?: boolean;
  cascade_enabled?: boolean;
  memo_count?: number;
};

type FetchStepResult = {
  response: Response;
  body: unknown;
};

class StepTimeoutError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StepTimeoutError";
    this.code = code;
  }
}

function logStage(
  event: string,
  requestId: string,
  details: Record<string, unknown> = {},
) {
  console.log(
    JSON.stringify({
      event,
      requestId,
      version: FUNCTION_VERSION,
      at: new Date().toISOString(),
      ...details,
    }),
  );
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

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") {
    return fallback;
  }

  const record = body as Record<string, unknown>;
  const value =
    record.message ||
    record.error_description ||
    record.error ||
    record.msg ||
    record.hint;

  return typeof value === "string" && value.trim() ? value : fallback;
}

async function fetchStep(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutCode: string,
  timeoutMessage: string,
): Promise<FetchStepResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await readResponseBody(response);
    return { response, body };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new StepTimeoutError(timeoutCode, timeoutMessage);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
    const requestId =
      request.headers.get("x-request-id") || crypto.randomUUID();

    // 진단에서 검증된 가장 작은 경로로 CORS 사전 요청에 즉시 응답합니다.
    if (request.method === "OPTIONS") {
      logStage("CORS_PREFLIGHT_OK", requestId);
      return new Response("ok", {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "X-Request-Id": requestId,
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        {
          ok: false,
          code: "METHOD_NOT_ALLOWED",
          error: "POST 요청만 허용됩니다.",
        },
        405,
        requestId,
      );
    }

    logStage("DELETE_REQUEST_RECEIVED", requestId);

    try {
      const authorization = request.headers.get("Authorization") || "";

      if (!authorization.startsWith("Bearer ")) {
        return jsonResponse(
          {
            ok: false,
            code: "MISSING_AUTHORIZATION",
            error: "로그인 인증 정보가 없습니다.",
          },
          401,
          requestId,
        );
      }

      const accessToken = authorization.slice("Bearer ".length).trim();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
      const adminKey =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
        Deno.env.get("SUPABASE_SECRET_KEY");

      if (!supabaseUrl || !adminKey) {
        logStage("SERVER_CONFIGURATION_MISSING", requestId);
        return jsonResponse(
          {
            ok: false,
            code: "SERVER_CONFIGURATION_MISSING",
            error: "계정 삭제 서버의 관리자 키 설정이 완료되지 않았습니다.",
          },
          500,
          requestId,
        );
      }

      let requestBody: { confirmation?: string } = {};

      try {
        requestBody = await request.json();
      } catch {
        return jsonResponse(
          {
            ok: false,
            code: "INVALID_REQUEST_BODY",
            error: "요청 형식이 올바르지 않습니다.",
          },
          400,
          requestId,
        );
      }

      if (requestBody.confirmation !== REQUIRED_CONFIRMATION) {
        return jsonResponse(
          {
            ok: false,
            code: "CONFIRMATION_MISMATCH",
            error: "계정 삭제 확인 문구가 일치하지 않습니다.",
          },
          400,
          requestId,
        );
      }

      // 1) 사용자 JWT를 Supabase Auth 서버에서 직접 재검증합니다.
      logStage("USER_AUTH_CHECK_STARTED", requestId);
      const userResult = await fetchStep(
        `${supabaseUrl}/auth/v1/user`,
        {
          method: "GET",
          headers: {
            apikey: adminKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
        8000,
        "USER_AUTH_CHECK_TIMEOUT",
        "로그인 사용자 확인 시간이 초과되었습니다.",
      );

      if (!userResult.response.ok) {
        const message = getErrorMessage(
          userResult.body,
          "로그인 세션을 확인할 수 없습니다.",
        );
        logStage("USER_AUTHENTICATION_FAILED", requestId, {
          status: userResult.response.status,
          message,
        });
        return jsonResponse(
          {
            ok: false,
            code: "INVALID_SESSION",
            error: "로그인 세션을 확인할 수 없습니다.",
          },
          401,
          requestId,
        );
      }

      const user = userResult.body as AuthUser | null;

      if (!user?.id) {
        logStage("USER_AUTHENTICATION_FAILED", requestId, {
          message: "user id missing",
        });
        return jsonResponse(
          {
            ok: false,
            code: "INVALID_SESSION",
            error: "로그인 사용자를 확인할 수 없습니다.",
          },
          401,
          requestId,
        );
      }

      logStage("USER_AUTHENTICATED", requestId, { userId: user.id });

      const jwtPayload = decodeJwtPayload(accessToken);

      if (!jwtPayload || !hasRecentPasswordAuthentication(jwtPayload, user.id)) {
        logStage("RECENT_PASSWORD_AUTH_REQUIRED", requestId, {
          userId: user.id,
        });
        return jsonResponse(
          {
            ok: false,
            code: "RECENT_PASSWORD_AUTH_REQUIRED",
            error:
              "보안을 위해 현재 비밀번호로 다시 본인 확인한 뒤 삭제해야 합니다.",
          },
          403,
          requestId,
        );
      }

      logStage("RECENT_PASSWORD_AUTH_VERIFIED", requestId, {
        userId: user.id,
      });

      // 2) Auth 삭제 전에 memos 외래 키가 ON DELETE CASCADE인지 확인합니다.
      logStage("DATABASE_GUARD_STARTED", requestId, { userId: user.id });
      const readinessResult = await fetchStep(
        `${supabaseUrl}/rest/v1/rpc/get_account_deletion_readiness`,
        {
          method: "POST",
          headers: {
            apikey: adminKey,
            Authorization: `Bearer ${adminKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ target_user_id: user.id }),
        },
        8000,
        "DATABASE_GUARD_TIMEOUT",
        "계정 삭제 안전 점검 시간이 초과되었습니다.",
      );

      if (!readinessResult.response.ok) {
        const message = getErrorMessage(
          readinessResult.body,
          "계정 삭제 안전 점검을 실행하지 못했습니다.",
        );
        logStage("DATABASE_GUARD_FAILED", requestId, {
          status: readinessResult.response.status,
          message,
        });
        return jsonResponse(
          {
            ok: false,
            code: "ACCOUNT_DELETE_GUARD_UNAVAILABLE",
            error:
              "계정 삭제용 데이터베이스 안전 점검이 준비되지 않았습니다.",
          },
          503,
          requestId,
        );
      }

      const readinessRaw = readinessResult.body;
      const readiness = (Array.isArray(readinessRaw)
        ? readinessRaw[0]
        : readinessRaw) as DeletionReadiness | null;

      if (!readiness?.ready || !readiness?.cascade_enabled) {
        logStage("DATABASE_SCHEMA_NOT_READY", requestId, { readiness });
        return jsonResponse(
          {
            ok: false,
            code: "ACCOUNT_DELETE_SCHEMA_NOT_READY",
            error:
              "계정 삭제용 ON DELETE CASCADE 설정이 아직 완료되지 않았습니다.",
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

      // 3) 관리자 Auth API로 현재 사용자만 영구 삭제합니다.
      //    CASCADE가 같은 DB 트랜잭션에서 메모를 정리하므로 선삭제/후검증 쿼리는 없습니다.
      logStage("AUTH_DELETE_STARTED", requestId, { userId: user.id });
      const deleteResult = await fetchStep(
        `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(user.id)}`,
        {
          method: "DELETE",
          headers: {
            apikey: adminKey,
            Authorization: `Bearer ${adminKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ should_soft_delete: false }),
        },
        12000,
        "AUTH_DELETE_TIMEOUT",
        "로그인 계정 삭제 시간이 초과되었습니다.",
      );

      if (!deleteResult.response.ok) {
        const message = getErrorMessage(
          deleteResult.body,
          "로그인 계정을 삭제하지 못했습니다.",
        );
        const classified = classifyAuthDeleteError(message);
        logStage("AUTH_DELETE_FAILED", requestId, {
          userId: user.id,
          status: deleteResult.response.status,
          code: classified.code,
          message,
        });
        return jsonResponse(
          { ok: false, ...classified },
          deleteResult.response.status >= 400
            ? deleteResult.response.status
            : 500,
          requestId,
        );
      }

      logStage("AUTH_DELETE_COMPLETED", requestId, { userId: user.id });
      logStage("DELETE_RESPONSE_SENT", requestId, { userId: user.id });

      return jsonResponse(
        {
          ok: true,
          accountDeleted: true,
          deletedMemoCount: expectedMemoCount,
          cleanupMode: "cascade",
        },
        200,
        requestId,
      );
    } catch (error) {
      if (error instanceof StepTimeoutError) {
        logStage("STEP_TIMEOUT", requestId, {
          code: error.code,
          message: error.message,
        });
        return jsonResponse(
          {
            ok: false,
            code: error.code,
            error: error.message,
          },
          504,
          requestId,
        );
      }

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
