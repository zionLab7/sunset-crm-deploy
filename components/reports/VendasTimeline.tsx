"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VendasTimelineData {
    date: string;
    vendas: number;
}

interface VendasTimelineProps {
    data: VendasTimelineData[];
}

export function VendasTimeline({ data }: VendasTimelineProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>📈 Vendas ao Longo do Tempo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum dado disponível
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Formatar dados para exibição
    const formattedData = data.map((item) => ({
        ...item,
        dateFormatted: format(new Date(item.date), "dd/MM", { locale: ptBR }),
    }));

    const totalVendas = data.reduce((sum, item) => sum + item.vendas, 0);
    const mediaVendas = data.length > 0 ? Math.round(totalVendas / data.length) : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>📈 Vendas ao Longo do Tempo (Últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="dateFormatted"
                            tick={{ fontSize: 12 }}
                            interval="preserveStartEnd"
                        />
                        <YAxis />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                                            <p className="font-semibold">
                                                {format(new Date(data.date), "dd 'de' MMMM", { locale: ptBR })}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                💰 Vendas: {data.vendas}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="vendas"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))", r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* Estatísticas */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Total no Período</p>
                        <p className="text-xl font-bold text-primary">{totalVendas}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Média por Dia</p>
                        <p className="text-xl font-bold text-primary">{mediaVendas}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
