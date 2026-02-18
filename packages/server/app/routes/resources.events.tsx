import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { LoaderFunctionArgs } from "react-router";

import { loadWithComparison } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";
import { requireAuth } from "~/lib/auth";
import type { loader as eventDataLoader } from "./resources.eventdata";
import {
    TableBody,
    TableCell,
    TableRow,
} from "~/components/ui/table";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import PaginationButtons from "~/components/PaginationButtons";

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);
    return loadWithComparison(request, (site, interval, tz, filters, page, startDate, endDate) =>
        context.analyticsEngine.getEventCounts(
            site, interval, tz, filters, page, 10, startDate, endDate,
        ),
    );
}

function EventDataSubRows({
    siteId,
    interval,
    timezone,
    eventName,
}: {
    siteId: string;
    interval: string;
    timezone: string;
    eventName: string;
}) {
    const fetcher = useFetcher<typeof eventDataLoader>();
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetcher.submit(
            { site: siteId, interval, timezone, eventName, page },
            { method: "get", action: "/resources/eventdata" },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, interval, timezone, eventName, page]);

    const rows = fetcher.data?.countsByProperty || [];
    const countFormatter = Intl.NumberFormat("en", { notation: "compact" });
    const hasMore = rows.length === 10;

    if (fetcher.state === "loading" && rows.length === 0) {
        return (
            <div className="pl-8 py-2 text-sm text-muted-foreground">
                Loading...
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="pl-8 py-2 text-sm text-muted-foreground">
                No data
            </div>
        );
    }

    return (
        <div className={fetcher.state === "loading" ? "opacity-60" : ""}>
            <TableBody>
                {rows.map(([value, count]) => (
                    <TableRow
                        key={value}
                        className="grid-cols-[minmax(0,1fr),minmax(0,8ch)] bg-muted/30"
                    >
                        <TableCell className="pl-8 overflow-hidden font-medium whitespace-normal flex items-center gap-2">
                            {/^https?:\/\//.test(value) ? (
                                <>
                                    <span className="truncate">{value}</span>
                                    <a
                                        href={value}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline whitespace-nowrap ml-1 text-muted-foreground hover:text-foreground"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </>
                            ) : (
                                <span className="truncate">
                                    {value || "(empty)"}
                                </span>
                            )}
                        </TableCell>
                        <TableCell className="text-right min-w-16">
                            {countFormatter.format(count)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <PaginationButtons
                page={page}
                hasMore={hasMore}
                handlePagination={setPage}
            />
        </div>
    );
}

export const EventsCard = ({
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
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Event", "Count"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/events"
            filters={filters}
            onClick={(eventName) => {
                if (expandedEvent === eventName) {
                    setExpandedEvent(null);
                } else {
                    setExpandedEvent(eventName);
                }
            }}
            timezone={timezone}
            renderAfterRow={(eventName: string) =>
                expandedEvent === eventName ? (
                    <EventDataSubRows
                        siteId={siteId}
                        interval={interval}
                        timezone={timezone}
                        eventName={eventName}
                    />
                ) : null
            }
            rowIcon={(eventName: string) =>
                expandedEvent === eventName ? (
                    <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                ) : (
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                )
            }
        />
    );
};
