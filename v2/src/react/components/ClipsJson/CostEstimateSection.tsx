"use client";

import { DollarSign } from "lucide-react";

interface CostEstimateSectionProps {
    inputTokens?: number;
    outputTokens?: number;
    inputCostPerToken?: number;
    outputCostPerToken?: number;
}

export default function CostEstimateSection({
    inputTokens = 0,
    outputTokens = 0,
    inputCostPerToken = 0.00000125, // Default for Gemini 2.5 Flash
    outputCostPerToken = 0.000005    // Default for Gemini 2.5 Flash
}: CostEstimateSectionProps) {
    const inputCost = inputTokens * inputCostPerToken;
    const outputCost = outputTokens * outputCostPerToken;
    const totalCost = inputCost + outputCost;

    const formatCost = (cost: number) => {
        if (cost === 0) return "$0.00";
        if (cost < 0.0001) return `${cost.toFixed(6)}`;
        if (cost < 0.01) return `${cost.toFixed(4)}`;
        return `${cost.toFixed(2)}`;
    };

    return (
        <div className="space-y-3 pt-3 border-t">
            <h3 className="text-sm font-medium text-muted-foreground flex gap-2 items-center"><DollarSign className="w-4 h-4" /> Cost Estimate</h3>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">
                        Input {inputTokens > 0 && `(${inputTokens.toLocaleString()} tokens)`}
                    </span>
                    <span>{formatCost(inputCost)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">
                        Output {outputTokens > 0 && `(${outputTokens.toLocaleString()} tokens)`}
                    </span>
                    <span>{formatCost(outputCost)}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Total</span>
                    <span>{formatCost(totalCost)}</span>
                </div>
            </div>
        </div>
    );
}