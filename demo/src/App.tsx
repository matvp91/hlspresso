import clsx from "clsx";
import type Hls from "hls.js";
import type { InterstitialsManager } from "hls.js";

export function App({ hls }: { hls: Hls }) {
  const { interstitialsManager } = hls;
  if (!interstitialsManager) {
    return null;
  }
  return (
    <div className="p-4">
      Integrated
      <Schedule name="integrated" manager={interstitialsManager} />
      Playout
      <Schedule name="playout" manager={interstitialsManager} />
    </div>
  );
}

function Schedule({
  name,
  manager,
}: {
  name: "integrated" | "playout";
  manager: InterstitialsManager;
}) {
  const items = manager.schedule;
  const currentTime =
    name === "playout"
      ? manager.primary.currentTime
      : manager[name].currentTime;
  if (!items.length) {
    return null;
  }
  const start = items[0][name].start;
  const end = items[items.length - 1][name].end;
  const duration = end - start;

  return (
    <div className="h-4 flex mb-4 relative">
      {items.map((item, i) => {
        const { start, end } = item[name];
        return (
          <div
            className={clsx(
              "h-full relative",
              item.event ? "bg-amber-400" : "bg-gray-200",
            )}
            key={`${i}${start}`}
            style={{
              width: `${((end - start) / duration) * 100}%`,
            }}
          >
            <div className="absolute w-1 rounded-full -left-0.5 h-1 bg-pink-500 top-full" />
          </div>
        );
      })}
      <div
        className="w-px h-full bg-black absolute top-0 -translate-x-[0.5px]"
        style={{
          left: `${(currentTime / duration) * 100}%`,
        }}
      />
    </div>
  );
}
