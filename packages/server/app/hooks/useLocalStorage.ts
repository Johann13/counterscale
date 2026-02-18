import { useState, useCallback } from "react";

export function useLocalStorage<T>(
    key: string,
    defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === "undefined") return defaultValue;
        try {
            const item = window.localStorage.getItem(key);
            return item !== null ? (JSON.parse(item) as T) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            setStoredValue((prev) => {
                const next =
                    value instanceof Function ? value(prev) : value;
                try {
                    window.localStorage.setItem(key, JSON.stringify(next));
                } catch {
                    // quota exceeded or private browsing
                }
                return next;
            });
        },
        [key],
    );

    return [storedValue, setValue];
}
