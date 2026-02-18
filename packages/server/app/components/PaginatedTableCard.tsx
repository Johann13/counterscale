import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import type { ReactNode } from "react";
import TableCard from "~/components/TableCard";
import PieChartCard from "~/components/PieChartCard";
import VisualizationToggle from "~/components/VisualizationToggle";
import { ArrowLeftRight } from "lucide-react";

import { Card } from "./ui/card";
import PaginationButtons from "./PaginationButtons";
import { SearchFilters } from "~/lib/types";

interface PaginatedTableCardProps {
    siteId: string;
    interval: string;
    dataFetcher: any;
    columnHeaders: string[];
    filters?: SearchFilters;
    extraParams?: Record<string, string>;
    loaderUrl: string;
    onClick?: (key: string) => void;
    timezone?: string;
    labelFormatter?: (label: string) => string;
    headerExtra?: ReactNode;
    renderAfterRow?: (key: string) => ReactNode;
    rowIcon?: (key: string) => ReactNode;
    enableChart?: boolean;
}

const PaginatedTableCard = ({
    siteId,
    interval,
    dataFetcher,
    columnHeaders,
    filters,
    extraParams,
    loaderUrl,
    onClick,
    timezone,
    labelFormatter,
    headerExtra,
    renderAfterRow,
    rowIcon,
    enableChart = false,
}: PaginatedTableCardProps) => {
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const previousCountsByProperty =
        dataFetcher.data?.previousCountsByProperty || null;
    const [page, setPage] = useState(1);
    const [compare, setCompare] = useLocalStorage("cs:compare", false);
    const [mode, setMode] = useLocalStorage<"table" | "chart">(
        "cs:viewMode",
        "table",
    );

    const mergedExtraParams = useMemo(
        () => ({
            ...extraParams,
            ...(compare ? { compare: "1" } : {}),
        }),
        [extraParams, compare],
    );

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
            ...mergedExtraParams,
            page,
        };

        dataFetcher.submit(params, {
            method: "get",
            action: loaderUrl,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaderUrl, siteId, interval, filters, mergedExtraParams, timezone, page]);

    function handlePagination(page: number) {
        setPage(page);
    }

    const hasMore = countsByProperty.length === 10;
    const isChartMode = mode === "chart" && enableChart;

    return (
        <Card className={dataFetcher.state === "loading" ? "opacity-60" : ""}>
            <div className="flex items-center justify-between px-3 pt-2">
                {enableChart ? (
                    <span className="text-left font-medium p-3">
                        {columnHeaders[0]}
                    </span>
                ) : (
                    <span>{headerExtra}</span>
                )}
                <div className="flex items-center gap-1">
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
                    {enableChart && (
                        <VisualizationToggle mode={mode} onToggle={setMode} />
                    )}
                </div>
            </div>
            {countsByProperty ? (
                isChartMode ? (
                    compare && previousCountsByProperty ? (
                        <div>
                            <div className="text-center text-xs text-muted-foreground font-medium">
                                Current
                            </div>
                            <PieChartCard
                                countByProperty={countsByProperty}
                                labelFormatter={labelFormatter}
                            />
                            <div className="text-center text-xs text-muted-foreground font-medium mt-2">
                                Previous
                            </div>
                            <PieChartCard
                                countByProperty={previousCountsByProperty}
                                labelFormatter={labelFormatter}
                            />
                        </div>
                    ) : (
                        <PieChartCard
                            countByProperty={countsByProperty}
                            labelFormatter={labelFormatter}
                        />
                    )
                ) : (
                    <div className="grid grid-rows-[auto,40px] h-full">
                        <TableCard
                            countByProperty={countsByProperty}
                            columnHeaders={columnHeaders}
                            onClick={onClick}
                            labelFormatter={labelFormatter}
                            renderAfterRow={renderAfterRow}
                            rowIcon={rowIcon}
                            previousCountByProperty={
                                compare ? previousCountsByProperty : null
                            }
                        />
                        <PaginationButtons
                            page={page}
                            hasMore={hasMore}
                            handlePagination={handlePagination}
                        />
                    </div>
                )
            ) : null}
        </Card>
    );
};

export default PaginatedTableCard;
