import clsx from "clsx";
import format from "format-duration";
import type Hls from "hls.js";
import type { InterstitialsManager } from "hls.js";
import type { PointerEventHandler } from "react";

export function App({ hls }: { hls: Hls }) {
  const { interstitialsManager } = hls;
  if (!interstitialsManager) {
    return null;
  }
  return (
    <div className="grid gap-4 mt-4">
      <Schedule manager={interstitialsManager} />
      {interstitialsManager.playingItem?.event ? (
        <div>
          {!interstitialsManager.playingItem.event.restrictions.skip ? (
            <button
              className="btn"
              type="button"
              onClick={() => interstitialsManager.skip()}
            >
              Skip
            </button>
          ) : null}
        </div>
      ) : null}
      <Metadata hls={hls} />
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
  const scheduleStart = manager.integrated.seekableStart;
  const scheduleEnd = manager.integrated.duration;
  const scheduleDuration = scheduleEnd - scheduleStart;

  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    let percent = (event.clientX - left) / width;
    percent = Math.max(0, Math.min(1, percent));
    manager.integrated.currentTime = scheduleStart + scheduleDuration * percent;
  };

  return (
    <div className="text-sm font-mono" onPointerUp={onPointerUp}>
      <div className="flex items-center h-6">
        {format(scheduleStart * 1000, { ms: true })}
        <div className="grow" />
        {format(scheduleEnd * 1000, { ms: true })}
      </div>
      <div className="relative h-12">
        <div className="flex h-2 relative">
          {items.map((item, i) => {
            const start = item.integrated.start;
            let end = item.integrated.end;
            if (!Number.isFinite(end)) {
              end = scheduleEnd;
            }
            const duration = end - start;
            if (!duration) {
              return null;
            }
            const startPercentage = (start - scheduleStart) / scheduleDuration;
            return (
              <div
                className={clsx(
                  "h-full absolute",
                  item.event ? "bg-yellow-500" : "bg-gray-200",
                )}
                key={`${i}${start}`}
                style={{
                  left: `${startPercentage * 100}%`,
                  width: `${(duration / scheduleDuration) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <div className="h-6 relative flex items-center">
          {items.map((item, i) => {
            const { start } = item.integrated;
            if (!item.event) {
              return null;
            }
            return (
              <div
                key={`${i}${start}`}
                className={clsx(
                  "absolute rounded-full -translate-x-1/2 h-2 w-2",
                  item.event.assetListLoaded ? "bg-yellow-500" : "bg-black",
                )}
                style={{
                  left: `${((start - scheduleStart) / scheduleDuration) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <div
          className="absolute top-0 h-full flex items-center flex-col -translate-x-1/2"
          style={{
            left: `${((currentTime - scheduleStart) / scheduleDuration) * 100}%`,
          }}
        >
          <div className="h-full bg-black top-0 w-px" />
          {format(currentTime * 1000, { ms: true })}
        </div>
      </div>
    </div>
  );
}

function Metadata({ hls }: { hls: Hls }) {
  return (
    <>
      {hls.interstitialsManager ? (
        <div>
          sliding window:{" "}
          {format(
            (hls.interstitialsManager.primary.duration -
              hls.interstitialsManager.primary.seekableStart) *
              1000,
            { ms: true },
          )}
        </div>
      ) : null}
    </>
  );
}
