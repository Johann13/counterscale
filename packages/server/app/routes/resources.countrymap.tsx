import { Component, useEffect, useState } from "react";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import type { ErrorInfo, ReactNode } from "react";
import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import { SearchFilters } from "~/lib/types";
import { Card } from "~/components/ui/card";
import WorldMap from "~/components/WorldMap";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;
    const { interval, site } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    const [countsByCountry, cityCoords] = await Promise.all([
        analyticsEngine.getVisitorCountByColumn(site, "country", interval, tz, filters, 1),
        analyticsEngine.getCountByCityWithCoordinates(
            site,
            interval,
            tz,
            filters,
        ),
    ]);

    // Process city coordinates: split blob18 for city name, blob19 for lat/lon
    // Deduplicate by city name, keeping the highest-count entry
    const cityMap = new Map<
        string,
        { city: string; lat: number; lon: number; count: number }
    >();
    for (const [regionCity, latLon, count] of cityCoords) {
        const cityParts = regionCity.split("|");
        const city = cityParts[1] || "";
        if (!city) continue;

        const coordParts = latLon.split("|");
        const lat = parseFloat(coordParts[0]);
        const lon = parseFloat(coordParts[1]);
        if (isNaN(lat) || isNaN(lon)) continue;

        const existing = cityMap.get(city);
        if (!existing || count > existing.count) {
            cityMap.set(city, { city, lat, lon, count });
        }
    }

    return {
        countsByCountry: countsByCountry.map(
            ([code, count]: [string, number]) => ({
                code,
                count,
            }),
        ),
        cityMarkers: Array.from(cityMap.values()),
    };
}

class MapErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("WorldMap failed to render:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}

export const WorldMapCard = ({
    siteId,
    interval,
    filters,
    onFilterChange,
    timezone,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
    onFilterChange: (filters: SearchFilters) => void;
    timezone: string;
}) => {
    const fetcher = useFetcher<typeof loader>();
    const [mapMode, setMapMode] = useLocalStorage<"countries" | "cities">(
        "cs:mapMode",
        "countries",
    );

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
        };

        fetcher.submit(params, {
            method: "get",
            action: "/resources/countrymap",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, interval, filters, timezone]);

    const data = fetcher.data?.countsByCountry || [];
    const cityMarkers = fetcher.data?.cityMarkers || [];

    return (
        <Card className={fetcher.state === "loading" ? "opacity-60" : ""}>
            <div className="flex justify-end gap-1 px-4 pt-3">
                {(["countries", "cities"] as const).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => setMapMode(mode)}
                        className={`text-xs px-2 py-1 rounded border transition-colors capitalize ${
                            mapMode === mode
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
            <MapErrorBoundary>
                <WorldMap
                    data={data}
                    cityMarkers={cityMarkers}
                    mode={mapMode}
                    onCountryClick={(country) =>
                        onFilterChange({ ...filters, country })
                    }
                    onCityClick={(city) =>
                        onFilterChange({ ...filters, city })
                    }
                />
            </MapErrorBoundary>
        </Card>
    );
};
