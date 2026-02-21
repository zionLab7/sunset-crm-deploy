"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Users, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface StatsCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    onClick?: () => void;
    urgent?: boolean;
}

export function StatsCard({
    title,
    value,
    description,
    icon,
    trend,
    onClick,
    urgent = false,
}: StatsCardProps) {
    const baseClass = onClick ? "cursor-pointer transition-all hover:scale-105 hover:shadow-lg" : "";
    const urgentClass = urgent ? "border-red-500 border-2" : "";

    return (
        <Card className={`${baseClass} ${urgentClass}`} onClick={onClick}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className={urgent ? "text-red-500" : "text-muted-foreground"}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${urgent ? "animate-pulse-red" : ""}`}>
                    {value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
                {trend && (
                    <div className="flex items-center text-xs mt-2">
                        <TrendingUp
                            className={`h-4 w-4 mr-1 ${trend === "up" ? "text-green-500" : "text-red-500"
                                }`}
                        />
                        <span className={trend === "up" ? "text-green-500" : "text-red-500"}>
                            {trend === "up" ? "Aumentou" : "Diminuiu"} este mês
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface DashboardStatsProps {
    monthlyGoal: number;
    currentValue: number;
    overdueTasks: number;
    newLeads: number;
}

export function DashboardStats({
    monthlyGoal,
    currentValue,
    overdueTasks,
    newLeads,
}: DashboardStatsProps) {
    const router = useRouter();
    const progress = monthlyGoal > 0 ? (currentValue / monthlyGoal) * 100 : 0;
    const remaining = Math.max(monthlyGoal - currentValue, 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Card Meta do Mês */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meta do Mês</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(currentValue)}</div>
                    <p className="text-xs text-muted-foreground">
                        de {formatCurrency(monthlyGoal)}
                    </p>
                    <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-gradient-success h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Faltam {formatCurrency(remaining)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Card Urgente */}
            <StatsCard
                title="Tarefas Urgentes"
                value={overdueTasks}
                description="Tarefas atrasadas que precisam de atenção"
                icon={<AlertCircle className="h-4 w-4" />}
                urgent={overdueTasks > 0}
                onClick={() => router.push("/calendar?filter=overdue")}
            />

            {/* Card Novos Leads */}
            <StatsCard
                title="Novos Leads"
                value={newLeads}
                description="Clientes em prospecção não contatados"
                icon={<Users className="h-4 w-4" />}
                onClick={() => router.push("/pipeline")}
            />

            {/* Card Taxa de Conversão */}
            <StatsCard
                title="Taxa de Conversão"
                value={`${progress.toFixed(1)}%`}
                description="Progresso em relação à meta"
                icon={<TrendingUp className="h-4 w-4" />}
                trend={progress >= 50 ? "up" : "neutral"}
            />
        </div>
    );
}
