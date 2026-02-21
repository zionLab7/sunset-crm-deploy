"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

interface FunnelDataItem {
    stage: string;
    count: number;
    color: string;
}

interface FunnelChartProps {
    data: FunnelDataItem[];
}

export function FunnelChart({ data }: FunnelChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>🔄 Funil de Conversão</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum dado disponível para o período selecionado
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Calcular percentual de conversão entre estágios
    const totalInicial = data[0]?.count || 1;
    const dataWithPercentage = data.map((item) => ({
        ...item,
        percentage: totalInicial > 0 ? Math.round((item.count / totalInicial) * 100) : 0,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>🔄 Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={dataWithPercentage}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="stage" type="category" width={90} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                                            <p className="font-semibold">{data.stage}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                👥 Clientes: {data.count}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                📊 Do total: {data.percentage}%
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                            {dataWithPercentage.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList dataKey="count" position="right" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Estatísticas de conversão */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Taxa de Conversão Final:</span>
                        <span className="text-lg font-bold text-primary">
                            {dataWithPercentage[dataWithPercentage.length - 1]?.percentage || 0}%
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        De {totalInicial} leads iniciais para {data[data.length - 1]?.count || 0} vendas fechadas
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
