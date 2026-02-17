import { useEffect, useState } from "react";
import TableCard from "~/components/TableCard";
import PieChartCard from "~/components/PieChartCard";
import VisualizationToggle from "~/components/VisualizationToggle";

import { Card } from "./ui/card";
import PaginationButtons from "./PaginationButtons";
import { SearchFilters } from "~/lib/types";

interface PaginatedTableCardWithChartProps {
    siteId: string;
    interval: string;
    dataFetcher: any;
    columnHeaders: string[];
    filters?: SearchFilters;
    loaderUrl: string;
    onClick?: (key: string) => void;
    timezone?: string;
    labelFormatter?: (label: string) => string;
    enableChart?: boolean;
}

const PaginatedTableCardWithChart = ({
    siteId,
    interval,
    dataFetcher,
    columnHeaders,
    filters,
    loaderUrl,
    onClick,
    timezone,
    labelFormatter,
    enableChart = false,
}: PaginatedTableCardWithChartProps) => {
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const [page, setPage] = useState(1);
    const [mode, setMode] = useState<"table" | "chart">("table");

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
            page,
        };

        dataFetcher.submit(params, {
            method: "get",
            action: loaderUrl,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaderUrl, siteId, interval, filters, timezone, page]);

    function handlePagination(page: number) {
        setPage(page);
    }

    const hasMore = countsByProperty.length === 10;
    const isChartMode = mode === "chart" && enableChart;
    return (
        <Card className={dataFetcher.state === "loading" ? "opacity-60" : ""}>
            {enableChart && (
                <div className="flex items-center justify-between px-3 pt-2">
                    <span className="text-left font-medium p-3">
                        {columnHeaders[0]}
                    </span>
                    <VisualizationToggle mode={mode} onToggle={setMode} />
                </div>
            )}
            {countsByProperty ? (
                isChartMode ? (
                    <PieChartCard
                        countByProperty={countsByProperty}
                        labelFormatter={labelFormatter}
                    />
                ) : (
                    <div className="grid grid-rows-[auto,40px] h-full">
                        <TableCard
                            countByProperty={countsByProperty}
                            columnHeaders={columnHeaders}
                            onClick={onClick}
                            labelFormatter={labelFormatter}
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

export default PaginatedTableCardWithChart;
