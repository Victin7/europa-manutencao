import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "admin" | "sindico" | "subsindico" | "conselheiro";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas a Administração pode executar esta ação.");
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

async function ensureUniqueUsername(
  supabaseAdmin: any,
  desired: string,
  excludeUserId?: string,
): Promise<string> {
  let base = normalizeUsername(desired);
  if (!base) base = "user";
  let candidate = base;
  let suffix = 0;
  // Try up to 50 candidates
  while (suffix < 50) {
    const q = supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("display_name", candidate);
    const { data: rows } = await q;
    const taken = (rows ?? []).some((r: any) => r.user_id !== excludeUserId);
    if (!taken) return candidate;
    suffix++;
    candidate = `${base}${suffix}`;
  }
  return `${base}_${Date.now().toString(36)}`;
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      pin: string;
      nome: string;
      display_name?: string;
      telefone?: string;
      cargo?: string;
      torre?: string | null;
      perfil: AppRole;
    }) => {
      if (!/^[0-9]{4,6}$/.test(input.pin)) {
        throw new Error("PIN inicial deve ter 4 a 6 dígitos numéricos.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        nome: data.nome,
        telefone: data.telefone ?? "",
        cargo: data.cargo ?? "",
        torre: data.torre ?? "",
        perfil: data.perfil,
      },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar usuário");

    const userId = created.user.id;
    if (data.perfil !== "sindico") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.perfil });
    }
    const desiredUsername = data.display_name && data.display_name.trim()
      ? data.display_name
      : data.email.split("@")[0];
    const finalUsername = await ensureUniqueUsername(supabaseAdmin, desiredUsername, userId);

    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      nome: data.nome,
      display_name: finalUsername,
      telefone: data.telefone ?? null,
      cargo: data.cargo ?? null,
      torre: data.torre ?? null,
      status: "ativo",
    });

    // Set PIN
    await supabaseAdmin.rpc("set_pin_proxy", { _user_id: userId, _pin: data.pin });

    return { user_id: userId, display_name: finalUsername };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      user_id: string;
      nome?: string;
      display_name?: string;
      telefone?: string | null;
      cargo?: string | null;
      torre?: string | null;
      status?: "ativo" | "inativo";
      perfil?: AppRole;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { user_id, perfil, display_name, ...patch } = data;
    const patchWithUsername: any = { ...patch };
    if (typeof display_name === "string" && display_name.trim().length > 0) {
      const normalized = normalizeUsername(display_name);
      if (!normalized) throw new Error("Nome de Usuário inválido.");
      // check uniqueness
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("display_name", normalized);
      if ((existing ?? []).some((r: any) => r.user_id !== user_id)) {
        throw new Error("Nome de Usuário já está em uso.");
      }
      patchWithUsername.display_name = normalized;
    }
    if (Object.keys(patchWithUsername).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(patchWithUsername).eq("user_id", user_id);
      if (error) throw new Error(error.message);
    }
    if (perfil) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id, role: perfil });
    }
    return { ok: true };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; password: string }) => {
    if (input.password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);

    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const emailById = new Map<string, string>();
    list?.users?.forEach((u) => emailById.set(u.id, u.email ?? ""));

    const roleMap = new Map<string, AppRole>();
    roles?.forEach((r: any) => roleMap.set(r.user_id, r.role));

    return (profiles ?? []).map((p: any) => ({
      ...p,
      email: emailById.get(p.user_id) ?? "",
      perfil: (roleMap.get(p.user_id) ?? "sindico") as AppRole,
    }));
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) {
      throw new Error("Você não pode excluir a si mesmo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Block deletion of principal admin
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("is_principal, nome")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (target?.is_principal) {
      throw new Error("O Administrador Principal não pode ser excluído.");
    }

    // Cleanup: roles, profile, then auth user
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("profiles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    // Audit
    await supabaseAdmin.from("access_logs").insert({
      user_id: context.userId,
      email: target?.nome ?? data.user_id,
      perfil: "admin",
      event: `delete_user:${data.user_id}`,
    });
    return { ok: true };
  });

export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; status: "ativo" | "inativo" | "pendente" }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("is_principal")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (target?.is_principal && data.status !== "ativo") {
      throw new Error("O Administrador Principal não pode ser desativado.");
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("access_logs").insert({
      user_id: context.userId,
      email: data.user_id,
      perfil: "admin",
      event: `set_status:${data.status}`,
    });
    return { ok: true };
  });
