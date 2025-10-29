import clsx from "clsx";
import format from "format-duration";
import type Hls from "hls.js";
import type { InterstitialsManager } from "hls.js";

export function App({ hls }: { hls: Hls }) {
  const { interstitialsManager } = hls;
  if (!interstitialsManager) {
    return null;
  }
  return (
    <div className="mt-4">
      <Schedule manager={interstitialsManager} />
    </div>
  );
}

function Schedule({
  manager,
}: {
  manager: InterstitialsManager;
}) {
  const items = manager.schedule;
  const { currentTime } = manager.integrated;
  if (!items.length) {
    return null;
  }
  const scheduleStart = items[0].integrated.start;
  const scheduleEnd = items[items.length - 1].integrated.end;
  const scheduleDuration = scheduleEnd - scheduleStart;

  return (
    <div className="text-[10px] font-mono">
      <div className="flex items-center h-4">
        {format(scheduleStart, { ms: true })}
        <div className="grow" />
        {format(scheduleEnd, { ms: true })}
      </div>
      <div className="relative h-24">
        <div className="flex h-4">
          {items.map((item, i) => {
            const { start, end } = item.integrated;
            const duration = end - start;
            if (!duration) {
              return null;
            }
            return (
              <div
                className={clsx(
                  "h-full relative",
                  item.event ? "bg-yellow-500" : "bg-gray-200",
                )}
                key={`${i}${start}`}
                style={{
                  width: `${(duration / scheduleDuration) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <div className="h-4 relative flex items-center">
          {items.map((item, i) => {
            const { start } = item.integrated;
            if (!item.event) {
              return null;
            }
            return (
              <div
                key={`${i}${start}`}
                className={clsx(
                  "absolute rounded-full -translate-x-1/2",
                  item.event.assetListLoaded
                    ? "bg-yellow-500 w-2 h-2"
                    : "bg-black w-1 h-1",
                )}
                style={{
                  left: `${(start / scheduleDuration) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <div
          className="absolute top-0 h-full flex items-center flex-col -translate-x-1/2"
          style={{
            left: `${(currentTime / scheduleDuration) * 100}%`,
          }}
        >
          <div className="h-full bg-black top-0 w-px" />
          {format(currentTime * 1000, { ms: true })}
        </div>
      </div>
    </div>
  );
}
