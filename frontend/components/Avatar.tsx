const COLORS = ["#e17076", "#7bc862", "#65aadd", "#a695e7", "#ee7aae", "#6ec9cb", "#faa774", "#6ec9cb"];

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({
  id,
  name,
  size = 44,
  online,
}: {
  id: string;
  name: string;
  size?: number;
  online?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-medium text-white"
        style={{ backgroundColor: colorFor(id), fontSize: size * 0.38 }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-signal-panel"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            backgroundColor: online ? "#33c481" : "#5a6b7a",
          }}
        />
      )}
    </div>
  );
}
