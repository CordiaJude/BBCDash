import type { Rep } from "@/lib/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function RepAvatar({
  rep,
  size = 28,
}: {
  rep: Pick<Rep, "display_name" | "color_hex" | "photo_url">;
  size?: number;
}) {
  if (rep.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URLs, avatar-sized, not worth next/image config
      <img
        src={rep.photo_url}
        alt={rep.display_name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 0 2px var(--panel), 0 0 0 3px ${rep.color_hex}`,
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "var(--panel-alt)",
        color: "var(--foreground)",
        boxShadow: `0 0 0 2px var(--panel), 0 0 0 3px ${rep.color_hex}`,
      }}
    >
      {initials(rep.display_name)}
    </div>
  );
}
