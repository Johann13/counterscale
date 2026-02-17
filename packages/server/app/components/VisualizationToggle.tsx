import { PieChart, Table2 } from "lucide-react";

interface VisualizationToggleProps {
    mode: "table" | "chart";
    onToggle: (mode: "table" | "chart") => void;
}

export default function VisualizationToggle({
    mode,
    onToggle,
}: VisualizationToggleProps) {
    const nextMode = mode === "table" ? "chart" : "table";
    const Icon = mode === "table" ? PieChart : Table2;
    const label = mode === "table" ? "Switch to chart view" : "Switch to table view";

    return (
        <button
            onClick={() => onToggle(nextMode)}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
            aria-label={label}
        >
            <Icon size={16} />
        </button>
    );
}
