import { Component, useEffect } from "react";
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
        analyticsEngine.getCountByCountry(site, interval, tz, filters, 1),
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
            <MapErrorBoundary>
                <WorldMap
                    data={data}
                    cityMarkers={cityMarkers}
                    onCountryClick={(country) =>
                        onFilterChange({ ...filters, country })
                    }
                />
            </MapErrorBoundary>
        </Card>
    );
};
