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
import { Download, FileBarChart2, TrendingUp, Users, DollarSign, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ScheduledDelivery {
    dueDate: string;
    value: number;
}

interface VendaProgramada {
    id: string;
    clientName: string;
    vendedorName: string;
    createdAt: string;
    totalValue: number;
    items: { productName: string; quantity: number }[];
    deliveries: ScheduledDelivery[];
}

interface ReportsData {
    vendedoresRanking: any[];
    funnelData: any[];
    vendasPorDia: any[];
    vendasProgramadas: VendaProgramada[];
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

                    {/* Vendas Programadas */}
                    {data.vendasProgramadas && data.vendasProgramadas.length > 0 && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <CalendarDays className="h-5 w-5 text-blue-500" />
                                        📅 Vendas Programadas
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {data.vendasProgramadas.length} venda(s) programada(s) registrada(s)
                                    </p>
                                </div>
                                <span className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full">
                                    Total: {formatCurrency(data.vendasProgramadas.reduce((sum, v) => sum + v.totalValue, 0))}
                                </span>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="pb-3 font-medium text-muted-foreground">Cliente</th>
                                                <th className="pb-3 font-medium text-muted-foreground">Vendedor</th>
                                                <th className="pb-3 font-medium text-muted-foreground">Registrado em</th>
                                                <th className="pb-3 font-medium text-muted-foreground">Produtos</th>
                                                <th className="pb-3 font-medium text-muted-foreground">Entregas</th>
                                                <th className="pb-3 font-medium text-muted-foreground text-right">Valor Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {data.vendasProgramadas.map((vp) => (
                                                <tr key={vp.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 font-medium">{vp.clientName}</td>
                                                    <td className="py-3 text-muted-foreground">{vp.vendedorName}</td>
                                                    <td className="py-3 text-muted-foreground">
                                                        {new Date(vp.createdAt).toLocaleDateString("pt-BR")}
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {vp.items.map((item, idx) => (
                                                                <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
                                                                    {item.productName} (x{item.quantity})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex flex-col gap-1">
                                                            {vp.deliveries.map((d, idx) => {
                                                                const isPast = new Date(d.dueDate + "T23:59:59") < new Date();
                                                                return (
                                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                                        <span className={`inline-block w-2 h-2 rounded-full ${
                                                                            isPast ? "bg-green-500" : "bg-amber-500"
                                                                        }`} />
                                                                        <span className="text-muted-foreground">
                                                                            {new Date(d.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                                                                        </span>
                                                                        <span className="font-medium">
                                                                            {formatCurrency(d.value)}
                                                                        </span>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                                            isPast
                                                                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                                                : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                                                        }`}>
                                                                            {isPast ? "Entregue" : "Pendente"}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-right font-semibold">
                                                        {formatCurrency(vp.totalValue)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
