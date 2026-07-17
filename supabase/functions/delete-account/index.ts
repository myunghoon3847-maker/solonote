import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "POST 요청만 허용됩니다." }, 405);
  }

  const authorization = request.headers.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse({ ok: false, error: "로그인 인증 정보가 없습니다." }, 401);
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Required Supabase environment variables are missing.");
    return jsonResponse({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, 500);
  }

  let requestBody: { confirmation?: string } = {};

  try {
    requestBody = await request.json();
  } catch (_error) {
    return jsonResponse({ ok: false, error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  if (requestBody.confirmation !== "계정 삭제") {
    return jsonResponse({ ok: false, error: "계정 삭제 확인 문구가 일치하지 않습니다." }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
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
    console.warn("Account deletion rejected: invalid user token.", userError?.message);
    return jsonResponse({ ok: false, error: "로그인 세션을 확인할 수 없습니다." }, 401);
  }

  // 메모를 먼저 지우고 Auth 사용자를 삭제합니다.
  // 데이터베이스의 ON DELETE CASCADE도 함께 적용하면 이중 안전장치가 됩니다.
  const { error: memoDeleteError } = await adminClient
    .from("memos")
    .delete()
    .eq("user_id", user.id);

  if (memoDeleteError) {
    console.error("Failed to delete user memos.", memoDeleteError.message);
    return jsonResponse({ ok: false, error: "사용자 메모를 삭제하지 못했습니다." }, 500);
  }

  const { error: userDeleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (userDeleteError) {
    console.error("Failed to delete auth user.", userDeleteError.message);
    return jsonResponse({ ok: false, error: "로그인 계정을 삭제하지 못했습니다." }, 500);
  }

  return jsonResponse({ ok: true });
});
