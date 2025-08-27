// Counter.tsx
"use client";

import { useCounterStore } from "../../store/store";

export default function Counter() {
    const { count, increment } = useCounterStore();

    return (
        <div className="flex flex-col items-center space-y-4">
            <p className="text-2xl font-bold">Count: {count}</p>
            <button
                onClick={increment}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
                Increment
            </button>
        </div>
    );
}
