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

    const countsByCountry = await analyticsEngine.getCountByCountry(
        site,
        interval,
        tz,
        filters,
        1,
    );

    return {
        countsByCountry: countsByCountry.map(
            ([code, count]: [string, number]) => ({
                code,
                count,
            }),
        ),
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

    return (
        <Card className={fetcher.state === "loading" ? "opacity-60" : ""}>
            <MapErrorBoundary>
                <WorldMap
                    data={data}
                    onCountryClick={(country) =>
                        onFilterChange({ ...filters, country })
                    }
                />
            </MapErrorBoundary>
        </Card>
    );
};
