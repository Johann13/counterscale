import { useMemo, useState } from "react";
import { useFetcher } from "react-router";

import type { LoaderFunctionArgs } from "react-router";

import PaginatedTableCard from "~/components/PaginatedTableCard";

import { loadWithComparison } from "~/lib/utils";
import { SearchFilters } from "~/lib/types";

function groupReferrersByDomain(
    countsByProperty: [string, number, number][],
): [string, number, number][] {
    const domainMap = new Map<string, [string, number, number]>();
    for (const [referrer, visitors, views] of countsByProperty) {
        let domain: string;
        try {
            domain = new URL(
                referrer.startsWith("http") ? referrer : `https://${referrer}`,
            ).hostname;
        } catch {
            domain = referrer;
        }
        const existing = domainMap.get(domain);
        if (existing) {
            existing[1] += visitors;
            existing[2] += views;
        } else {
            domainMap.set(domain, [domain, visitors, views]);
        }
    }
    return Array.from(domainMap.values()).sort((a, b) => b[1] - a[1]);
}

export async function loader({ context, request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const groupByDomain = url.searchParams.get("groupByDomain") === "1";

    const result = await loadWithComparison<[string, number, number][]>(
        request,
        (site, interval, tz, filters, page, startDate, endDate) =>
            context.analyticsEngine.getCountByReferrer(
                site, interval, tz, filters, page, startDate, endDate,
            ),
    );

    if (groupByDomain) {
        return {
            ...result,
            countsByProperty: groupReferrersByDomain(result.countsByProperty),
            previousCountsByProperty: result.previousCountsByProperty
                ? groupReferrersByDomain(result.previousCountsByProperty)
                : null,
        };
    }

    return result;
}

export const ReferrerCard = ({
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
    const [groupByDomain, setGroupByDomain] = useState(false);
    const extraParams = useMemo(
        () => (groupByDomain ? { groupByDomain: "1" } : undefined),
        [groupByDomain],
    );

    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Referrer", "Visitors", "Views"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/referrer"
            filters={filters}
            extraParams={extraParams}
            onClick={(referrer) => onFilterChange({ ...filters, referrer })}
            timezone={timezone}
            headerExtra={
                <button
                    type="button"
                    onClick={() => setGroupByDomain(!groupByDomain)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                        groupByDomain
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    title={
                        groupByDomain
                            ? "Showing grouped by domain"
                            : "Group by domain"
                    }
                >
                    Group by domain
                </button>
            }
        />
    );
};
