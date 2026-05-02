import { createSupabaseAdmin } from "@/lib/supabase";

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pixova.in";

  const staticRoutes = [
    { url: baseUrl, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${baseUrl}/explore`, changeFrequency: "hourly" as const, priority: 0.9 },
  ];

  try {
    const supabase = createSupabaseAdmin();
    const { data: studios } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("studio_profiles") as any)
      .select("slug, updated_at")
      .eq("is_listed", true)
      .eq("profile_complete", true)
      .order("updated_at", { ascending: false })
      .limit(5000);

    const studioRoutes = (studios || []).map((s: { slug: string; updated_at: string }) => ({
      url: `${baseUrl}/${s.slug}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticRoutes, ...studioRoutes];
  } catch {
    return staticRoutes;
  }
}
