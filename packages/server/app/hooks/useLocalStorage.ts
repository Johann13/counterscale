import { useState, useCallback, useEffect } from "react";

export function useLocalStorage<T>(
    key: string,
    defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(defaultValue);

    // Sync from localStorage after hydration
    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item !== null) {
                setStoredValue(JSON.parse(item) as T);
            }
        } catch {
            // ignore
        }
    }, [key]);

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
