import { createServerFn } from "@tanstack/react-start";
import { useSession, getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PinSessionData = { userId?: string; verifiedAt?: number };

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET não configurado");
  return {
    password,
    name: "europa-pin",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      path: "/",
    },
  };
}

async function getRoleAndProfile(supabaseAdmin: any, userId: string) {
  const [{ data: roleRow }, { data: prof }, { data: userInfo }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    supabaseAdmin
      .from("profiles")
      .select("user_id,nome,pin_hash,pin_failed_attempts,pin_locked_until,is_principal,torre")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(userId),
  ]);
  return {
    role: (roleRow?.role as string) ?? null,
    profile: prof ?? null,
    email: userInfo?.user?.email ?? "",
  };
}

async function logAccess(
  supabaseAdmin: any,
  payload: { user_id: string; email: string; perfil: string | null; event: string },
) {
  try {
    await supabaseAdmin.from("access_logs").insert({
      user_id: payload.user_id,
      email: payload.email,
      perfil: payload.perfil,
      ip: getRequestIP({ xForwardedFor: true }) ?? null,
      user_agent: getRequestHeader("user-agent") ?? null,
      event: payload.event,
    });
  } catch {
    /* best-effort */
  }
}

async function assertAdmin(supabaseAdmin: any, userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Apenas a Administração pode executar esta ação.");
}

export const getPinGateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile, email, role } = await getRoleAndProfile(supabaseAdmin, context.userId);

    const isPrincipal = !!profile?.is_principal;

    if (isPrincipal) {
      // Mark verified and log first transition
      const session = await useSession<PinSessionData>(sessionConfig());
      if (session.data.userId !== context.userId) {
        await session.update({ userId: context.userId, verifiedAt: Date.now() });
        await logAccess(supabaseAdmin, { user_id: context.userId, email, perfil: role, event: "login_success" });
      }
      return { requires_pin: false, verified: true, locked_until: null as string | null };
    }

    const session = await useSession<PinSessionData>(sessionConfig());
    const verified = session.data.userId === context.userId && !!session.data.verifiedAt;
    const lockedUntil = profile?.pin_locked_until ?? null;
    const requiresPin = !!profile?.pin_hash;

    return {
      requires_pin: requiresPin,
      verified,
      locked_until: lockedUntil,
      has_pin: !!profile?.pin_hash,
    };
  });

export const verifyPinAndComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string }) => {
    if (!/^[0-9]{4,6}$/.test(input.pin)) throw new Error("PIN inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile, email, role } = await getRoleAndProfile(supabaseAdmin, context.userId);

    if (!profile?.pin_hash) {
      throw new Error("Usuário não possui PIN configurado. Solicite à administração.");
    }
    if (profile.pin_locked_until && new Date(profile.pin_locked_until) > new Date()) {
      const mins = Math.ceil((new Date(profile.pin_locked_until).getTime() - Date.now()) / 60000);
      throw new Error(`Acesso bloqueado. Tente novamente em ${mins} minuto(s).`);
    }

    const { data: ok, error: verifyErr } = await supabaseAdmin.rpc("verify_pin_proxy", {
      _user_id: context.userId,
      _pin: data.pin,
    });
    if (verifyErr) throw new Error(verifyErr.message);
    const verified = !!ok;

    if (!verified) {
      const attempts = (profile.pin_failed_attempts ?? 0) + 1;
      const patch: any = { pin_failed_attempts: attempts };
      if (attempts >= 5) {
        patch.pin_locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        patch.pin_failed_attempts = 0;
      }
      await supabaseAdmin.from("profiles").update(patch).eq("user_id", context.userId);
      await logAccess(supabaseAdmin, {
        user_id: context.userId, email, perfil: role,
        event: attempts >= 5 ? "pin_locked" : "pin_fail",
      });
      if (attempts >= 5) {
        throw new Error("PIN incorreto. Acesso bloqueado por 15 minutos.");
      }
      throw new Error(`PIN incorreto. Tentativas restantes: ${5 - attempts}`);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ pin_failed_attempts: 0, pin_locked_until: null })
      .eq("user_id", context.userId);

    const session = await useSession<PinSessionData>(sessionConfig());
    await session.update({ userId: context.userId, verifiedAt: Date.now() });
    await logAccess(supabaseAdmin, { user_id: context.userId, email, perfil: role, event: "pin_success" });
    await logAccess(supabaseAdmin, { user_id: context.userId, email, perfil: role, event: "login_success" });

    return { ok: true };
  });

export const clearPinSession = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<PinSessionData>(sessionConfig());
  await session.clear();
  return { ok: true };
});

export const changeOwnPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { current_pin?: string; new_pin: string }) => {
    if (!/^[0-9]{4,6}$/.test(input.new_pin)) throw new Error("Novo PIN deve ter 4 a 6 dígitos numéricos");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("pin_hash,is_principal")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (prof?.is_principal) throw new Error("O Administrador Principal não utiliza PIN.");
    if (prof?.pin_hash) {
      if (!data.current_pin || !/^[0-9]{4,6}$/.test(data.current_pin)) {
        throw new Error("Informe o PIN atual.");
      }
      const { data: check } = await supabaseAdmin.rpc("verify_pin_proxy", {
        _user_id: context.userId, _pin: data.current_pin,
      });
      if (!check) throw new Error("PIN atual incorreto.");
    }
    await supabaseAdmin.rpc("set_pin_proxy", { _user_id: context.userId, _pin: data.new_pin });
    return { ok: true };
  });

export const adminResetPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; pin: string }) => {
    if (!/^[0-9]{4,6}$/.test(input.pin)) throw new Error("PIN deve ter 4 a 6 dígitos numéricos");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    await supabaseAdmin.rpc("set_pin_proxy", { _user_id: data.user_id, _pin: data.pin });
    return { ok: true };
  });

export const adminUnlockPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    await supabaseAdmin
      .from("profiles")
      .update({ pin_failed_attempts: 0, pin_locked_until: null })
      .eq("user_id", data.user_id);
    return { ok: true };
  });

export const adminListAccessLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("access_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
