import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Card } from "./ui/card";

const COLORS = [
    "#F46A3D",
    "#F99C35",
    "#f96d3e",
    "#56726C",
    "#E8934A",
    "#7A9990",
    "#C4C4C4",
];

const MAX_SLICES = 6;

type CountByProperty = [string | [string, string], string, string?][];

interface PieChartCardProps {
    countByProperty: CountByProperty;
    labelFormatter?: (label: string) => string;
}

function CustomTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        const { name, value } = payload[0];
        return (
            <Card className="p-2 shadow-lg leading-normal">
                <div className="font-semibold">{name}</div>
                <div>
                    {Intl.NumberFormat("en", { notation: "compact" }).format(
                        value,
                    )}{" "}
                    visitors
                </div>
            </Card>
        );
    }
    return null;
}

function truncateLabel(label: string, maxLength: number = 16): string {
    return label.length > maxLength
        ? label.slice(0, maxLength - 1) + "\u2026"
        : label;
}

export default function PieChartCard({
    countByProperty,
    labelFormatter,
}: PieChartCardProps) {
    if (!countByProperty || countByProperty.length === 0) {
        return null;
    }

    // Build chart data, grouping items beyond top MAX_SLICES into "Other"
    const chartData: { name: string; value: number }[] = [];
    let otherTotal = 0;

    for (let i = 0; i < countByProperty.length; i++) {
        const item = countByProperty[i];
        const desc = item[0];
        const label = Array.isArray(desc)
            ? desc[1] || "(unknown)"
            : desc || "(unknown)";
        const formattedLabel =
            labelFormatter && typeof label === "string"
                ? labelFormatter(label)
                : label;
        const value = parseInt(item[1], 10);

        if (i < MAX_SLICES) {
            chartData.push({ name: formattedLabel, value });
        } else {
            otherTotal += value;
        }
    }

    if (otherTotal > 0) {
        chartData.push({ name: "Other", value: otherTotal });
    }

    return (
        <div className="py-2 px-1">
            <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {chartData.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        formatter={(value: string) => truncateLabel(value)}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
