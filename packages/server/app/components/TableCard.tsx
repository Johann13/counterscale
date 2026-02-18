import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";

type CountByProperty = [string, string, string?][];

function ComparisonIndicator({
    current,
    previous,
}: {
    current: number;
    previous: string | undefined;
}) {
    if (previous === undefined) {
        return <div className="text-xs text-muted-foreground">—</div>;
    }
    const prev = parseInt(previous, 10);
    if (isNaN(prev) || (prev === 0 && current === 0)) {
        return <div className="text-xs text-muted-foreground">0%</div>;
    }
    if (prev === 0) {
        return <div className="text-xs text-green-600">+∞</div>;
    }
    const pctChange = ((current - prev) / prev) * 100;
    const sign = pctChange > 0 ? "+" : "";
    let color = "text-muted-foreground";
    if (pctChange > 0) color = "text-green-600";
    else if (pctChange < 0) color = "text-red-600";
    return (
        <div className={`text-xs ${color}`}>
            {sign}
            {Math.round(pctChange)}%
        </div>
    );
}

function calculateCountPercentages(countByProperty: CountByProperty) {
    const totalCount = countByProperty.reduce(
        (sum, row) => sum + parseInt(row[1]),
        0,
    );

    return countByProperty.map((row) => {
        const count = parseInt(row[1]);
        const percentage = ((count / totalCount) * 100).toFixed(2);
        return `${percentage}%`;
    });
}
export default function TableCard({
    countByProperty,
    columnHeaders,
    onClick,
    labelFormatter,
    renderAfterRow,
    rowIcon,
    previousCountByProperty,
}: {
    countByProperty: CountByProperty;
    columnHeaders: string[];
    onClick?: (key: string) => void;
    labelFormatter?: (label: string) => string;
    renderAfterRow?: (key: string) => ReactNode;
    rowIcon?: (key: string) => ReactNode;
    previousCountByProperty?: CountByProperty | null;
}) {
    const barChartPercentages = calculateCountPercentages(countByProperty);

    const countFormatter = Intl.NumberFormat("en", { notation: "compact" });

    // Build lookup from previous period data: label → [count1, count2?]
    const previousLookup = new Map<string, string[]>();
    if (previousCountByProperty) {
        for (const item of previousCountByProperty) {
            const desc = item[0];
            const key = Array.isArray(desc) ? desc[0] : desc;
            previousLookup.set(key as string, item.slice(1) as string[]);
        }
    }

    // Compute previous bar percentages relative to the same total as current
    // so bars are visually comparable
    const currentTotal = countByProperty.reduce(
        (sum, row) => sum + parseInt(row[1]),
        0,
    );
    const previousBarPercentages = previousCountByProperty
        ? countByProperty.map((item) => {
              const desc = item[0];
              const key = Array.isArray(desc) ? desc[0] : desc;
              const prevValues = previousLookup.get(key as string);
              if (!prevValues) return "0%";
              const prevCount = parseInt(prevValues[0], 10);
              if (isNaN(prevCount) || currentTotal === 0) return "0%";
              return `${((prevCount / currentTotal) * 100).toFixed(2)}%`;
          })
        : null;

    const gridCols =
        (columnHeaders || []).length === 3
            ? "grid-cols-[minmax(0,1fr),minmax(0,8ch),minmax(0,8ch)]"
            : "grid-cols-[minmax(0,1fr),minmax(0,8ch)]";

    return (
        <Table>
            <TableHeader>
                <TableRow className={`${gridCols}`}>
                    {(columnHeaders || []).map((header: string, index) => (
                        <TableHead
                            key={header}
                            className={
                                index === 0
                                    ? "text-left"
                                    : "text-right pr-4 pl-0"
                            }
                        >
                            {header}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {(countByProperty || []).map((item, index) => {
                    const desc = item[0];

                    // the description can be either a single string (that is both the key and the label),
                    // or a tuple of type [key, label]
                    const [key, label] = Array.isArray(desc)
                        ? [desc[0], desc[1] || "(unknown)"]
                        : [desc, desc || "(unknown)"];

                    const formattedLabel =
                        labelFormatter && typeof label === "string"
                            ? labelFormatter(label)
                            : label;

                    const icon = rowIcon ? rowIcon(key as string) : null;

                    return (
                        <div key={key as string}>
                            <TableRow
                                className={`group [&_td]:last:rounded-b-md ${gridCols}`}
                                width={barChartPercentages[index]}
                            >
                                <TableCell className="overflow-hidden font-medium min-w-48 whitespace-normal relative flex items-center justify-start gap-2">
                                    {icon}
                                    {/^https?:\/\//.test(label) ? (
                                        <>
                                            <img
                                                src={`/favicon?url=${encodeURIComponent(label)}`}
                                                alt="Favicon"
                                                className="w-5 h-5 mr-1 bg-white p-0.5 rounded-full"
                                                onError={(e) => {
                                                    // Fallback to external link icon if favicon fails to load
                                                    const target =
                                                        e.target as HTMLImageElement;
                                                    target.style.display =
                                                        "none";
                                                }}
                                            />
                                            {onClick ? (
                                                <button
                                                    onClick={() =>
                                                        onClick(key as string)
                                                    }
                                                    className="hover:underline select-text text-left truncate"
                                                >
                                                    {formattedLabel}
                                                </button>
                                            ) : (
                                                formattedLabel
                                            )}
                                            <a
                                                href={label}
                                                target={"_blank"}
                                                rel="noreferrer"
                                                aria-hidden="true"
                                                className="inline whitespace-nowrap ml-1"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        </>
                                    ) : (
                                        <>
                                            {onClick ? (
                                                <button
                                                    onClick={() =>
                                                        onClick(key as string)
                                                    }
                                                    className="hover:underline select-text text-left truncate"
                                                >
                                                    {formattedLabel}
                                                </button>
                                            ) : (
                                                formattedLabel
                                            )}
                                        </>
                                    )}
                                </TableCell>

                                <TableCell className="text-right min-w-16">
                                    <div>{countFormatter.format(parseInt(item[1], 10))}</div>
                                    {previousCountByProperty && (
                                        <ComparisonIndicator
                                            current={parseInt(item[1], 10)}
                                            previous={previousLookup.get(key as string)?.[0]}
                                        />
                                    )}
                                </TableCell>

                                {item.length > 2 && item[2] !== undefined && (
                                    <TableCell className="text-right min-w-16">
                                        <div>{countFormatter.format(parseInt(item[2], 10))}</div>
                                        {previousCountByProperty && (
                                            <ComparisonIndicator
                                                current={parseInt(item[2], 10)}
                                                previous={previousLookup.get(key as string)?.[1]}
                                            />
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                            {previousBarPercentages && (
                                <TableRow
                                    className={`${gridCols} opacity-50`}
                                    width={previousBarPercentages[index]}
                                >
                                    <TableCell className="overflow-hidden font-medium min-w-48 whitespace-normal relative flex items-center justify-start gap-2 text-muted-foreground text-xs">
                                        {formattedLabel}
                                    </TableCell>
                                    <TableCell className="text-right min-w-16 text-muted-foreground text-xs">
                                        {previousLookup.get(key as string)?.[0]
                                            ? countFormatter.format(parseInt(previousLookup.get(key as string)![0], 10))
                                            : "—"}
                                    </TableCell>
                                    {item.length > 2 && item[2] !== undefined && (
                                        <TableCell className="text-right min-w-16 text-muted-foreground text-xs">
                                            {previousLookup.get(key as string)?.[1]
                                                ? countFormatter.format(parseInt(previousLookup.get(key as string)![1], 10))
                                                : "—"}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )}
                            {renderAfterRow
                                ? renderAfterRow(key as string)
                                : null}
                        </div>
                    );
                })}
            </TableBody>
        </Table>
    );
}
