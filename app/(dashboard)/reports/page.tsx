"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { VendedoresRanking } from "@/components/reports/VendedoresRanking";
import { FunnelChart } from "@/components/reports/FunnelChart";
import { VendasTimeline } from "@/components/reports/VendasTimeline";
import { Download, FileBarChart2, TrendingUp, Users, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ReportsData {
    vendedoresRanking: any[];
    funnelData: any[];
    vendasPorDia: any[];
    metricas: {
        totalClientes: number;
        clientesAtivos: number;
        clientesFechados: number;
        taxaConversaoGeral: number;
        ticketMedio: number;
        valorTotalVendas: number;
    };
}

export default function ReportsPage() {
    const [period, setPeriod] = useState("month");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ReportsData | null>(null);

    useEffect(() => {
        fetchReports();
    }, [period]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports?period=${period}`);
            if (!res.ok) throw new Error("Erro ao buscar relatórios");
            const reportsData = await res.json();
            setData(reportsData);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar relatórios",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!data) return;

        // Criar CSV do ranking de vendedores
        const headers = ["Nome,Total Clientes,Clientes Fechados,Total Vendas,Conversão (%)"];
        const rows = data.vendedoresRanking.map((v) =>
            `${v.name},${v.totalClientes},${v.clientesFechados},${v.totalVendas},${v.conversao}`
        );

        const csv = [headers, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio-vendedores-${period}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "✅ CSV exportado!",
            description: "O arquivo foi baixado com sucesso.",
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Relatórios Gerenciais
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Análise de performance e métricas da equipe
                    </p>
                </div>
                <FileBarChart2 className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Filtros e Exportação */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">Última Semana</SelectItem>
                        <SelectItem value="month">Último Mês</SelectItem>
                        <SelectItem value="quarter">Último Trimestre</SelectItem>
                        <SelectItem value="year">Último Ano</SelectItem>
                    </SelectContent>
                </Select>

                <Button onClick={exportToCSV} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                </Button>
            </div>

            {/* Cards de Métricas */}
            {data && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total de Clientes
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {data.metricas.totalClientes}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.metricas.clientesAtivos} ativos
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Vendas Fechadas
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {data.metricas.clientesFechados}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.metricas.taxaConversaoGeral}% de conversão
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Valor Total
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(data.metricas.valorTotalVendas)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Em vendas fechadas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Ticket Médio
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(data.metricas.ticketMedio)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Por venda
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Gráficos */}
            {data && (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <VendedoresRanking data={data.vendedoresRanking} />
                        <FunnelChart data={data.funnelData} />
                    </div>

                    <VendasTimeline data={data.vendasPorDia} />
                </>
            )}
        </div>
    );
}
