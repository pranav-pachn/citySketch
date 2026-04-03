"use client";

import { useMemo } from "react";
import { Alignment, Fit, Layout, useRive } from "@rive-app/react-canvas";

export function RiveBadge() {
  const layout = useMemo(
    () =>
      new Layout({
        fit: Fit.Contain,
        alignment: Alignment.Center,
      }),
    []
  );

  const { RiveComponent } = useRive({
    src: "https://cdn.rive.app/animations/skills.riv",
    autoplay: true,
    layout,
  });

  return (
    <div className="rive-badge-shell" aria-hidden="true">
      <RiveComponent className="h-24 w-24" />
    </div>
  );
}
