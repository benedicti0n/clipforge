"use client";

import ClipsJsonLeft from "../ClipsJson/ClipsJsonLeft";
import ClipsJsonRight from "../ClipsJson/ClipsJsonRight";

export default function ClipsJson() {
    return (
        <div className="flex h-full gap-4">
            {/* LEFT PANEL */}
            <div className="w-1/3">
                <ClipsJsonLeft />
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1">
                <ClipsJsonRight />
            </div>
        </div>
    );
}
