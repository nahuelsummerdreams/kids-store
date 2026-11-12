import { createClient } from "@/lib/supabase";

// Instalación de un solo negocio: tomamos la primera membresía del usuario.
export async function getTenantId(): Promise<string> {
  const { data, error } = await createClient().from("memberships").select("tenant_id").limit(1).single();
  if (error || !data) throw new Error("No se encontró el negocio del usuario.");
  return data.tenant_id;
}
