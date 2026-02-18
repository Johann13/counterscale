import type { LoaderFunctionArgs } from "react-router";
import {
    getFiltersFromSearchParams,
    paramsFromUrl,
    getIntervalType,
    getDateTimeRange,
    getPreviousPeriodDateRange,
} from "~/lib/utils";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Card, CardContent } from "~/components/ui/card";
import ComparisonChart from "~/components/ComparisonChart";
import { SearchFilters } from "~/lib/types";
import { requireAuth } from "~/lib/auth";
import type { ViewsGroupedByInterval } from "~/analytics/query";
import { ArrowLeftRight } from "lucide-react";

function toChartData(viewsGroupedByInterval: ViewsGroupedByInterval) {
    const chartData: {
        date: string;
        views: number;
        visitors: number;
        bounceRate: number;
    }[] = [];

    viewsGroupedByInterval.forEach((row) => {
        const { views, visitors, bounces } = row[1];
        chartData.push({
            date: row[0],
            views,
            visitors,
            bounceRate: Math.floor(
                (visitors > 0 ? bounces / visitors : 0) * 100,
            ),
        });
    });

    return chartData;
}

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);

    const { analyticsEngine } = context;
    const { interval, site, compare } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    const intervalType = getIntervalType(interval);
    const { startDate, endDate } = getDateTimeRange(interval, tz);

    const currentPromise = analyticsEngine.getViewsGroupedByInterval(
        site, intervalType, startDate, endDate, tz, filters,
    );

    let previousPromise = null;
    if (compare === "1") {
        const { startDate: prevStartDate, endDate: prevEndDate } =
            getPreviousPeriodDateRange(interval, tz);
        previousPromise = analyticsEngine.getViewsGroupedByInterval(
            site, intervalType, prevStartDate, prevEndDate, tz, filters,
        );
    }

    const [currentViews, previousViews] = await Promise.all([
        currentPromise,
        previousPromise ?? Promise.resolve(null),
    ]);

    return {
        currentData: toChartData(currentViews),
        previousData: previousViews ? toChartData(previousViews) : null,
        intervalType,
    };
}

export const ComparisonCard = ({
    siteId,
    interval,
    filters,
    timezone,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
    timezone: string;
}) => {
    const dataFetcher = useFetcher<typeof loader>();
    const [compare, setCompare] = useState(true);
    const { currentData, previousData, intervalType } =
        dataFetcher.data || {};

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
            ...(compare ? { compare: "1" } : {}),
        };

        dataFetcher.submit(params, {
            method: "get",
            action: `/resources/comparison`,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, interval, filters, timezone, compare]);

    return (
        <Card>
            <CardContent>
                <div className="flex justify-end pt-2 -mb-2">
                    <button
                        type="button"
                        onClick={() => setCompare(!compare)}
                        className={`p-1 rounded transition-colors ${
                            compare
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                        title={compare ? "Hide comparison" : "Compare with previous period"}
                    >
                        <ArrowLeftRight size={16} />
                    </button>
                </div>
                <div className="h-80 pt-6 -m-4 -mr-10 -ml-10 sm:-m-2 sm:-ml-6 sm:-mr-6">
                    {currentData && (
                        <ComparisonChart
                            currentData={currentData}
                            previousData={previousData ?? []}
                            intervalType={intervalType}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
