"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface VendedorData {
    id: string;
    name: string;
    totalClientes: number;
    clientesFechados: number;
    totalVendas: number;
    conversao: number;
}

interface VendedoresRankingProps {
    data: VendedorData[];
}

const COLORS = [
    "hsl(142, 76%, 36%)", // Verde - 1º lugar
    "hsl(217, 91%, 60%)", // Azul - 2º lugar
    "hsl(48, 96%, 53%)",  // Amarelo - 3º lugar
    "hsl(var(--muted-foreground))", // Cinza - demais
];

export function VendedoresRanking({ data }: VendedoresRankingProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>🏆 Ranking de Vendedores</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum dado disponível para o período selecionado
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>🏆 Ranking de Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload as VendedorData;
                                    return (
                                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                                            <p className="font-semibold">{data.name}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                💰 Vendas: {formatCurrency(data.totalVendas)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                👥 Clientes: {data.clientesFechados}/{data.totalClientes}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                📊 Conversão: {data.conversao}%
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="totalVendas" radius={[0, 8, 8, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[Math.min(index, COLORS.length - 1)]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Legenda com top 3 */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {data.slice(0, 3).map((vendedor, index) => (
                        <div key={vendedor.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <div className="text-2xl">
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{vendedor.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(vendedor.totalVendas)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
