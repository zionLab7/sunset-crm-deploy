"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Target, DollarSign } from "lucide-react";

export function GoalConfigCard() {
    const [goal, setGoal] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetch("/api/admin/monthly-goal")
            .then(r => r.json())
            .then(d => {
                setGoal(d.monthlyGoal?.toString() || "0");
            })
            .catch(() => setGoal("0"))
            .finally(() => setFetching(false));
    }, []);

    const handleSave = async () => {
        const value = parseFloat(goal.replace(",", "."));
        if (isNaN(value) || value < 0) {
            toast({ variant: "destructive", title: "Valor inválido", description: "Digite um valor numérico positivo." });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/admin/monthly-goal", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ monthlyGoal: value }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao salvar");

            toast({ title: "✅ Meta atualizada!", description: `Meta mensal definida em U$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro ao salvar meta", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-primary/20">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-primary" />
                    Meta Mensal de Vendas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Define o valor de meta mensal exibido no dashboard para todos os vendedores.
                </p>
            </CardHeader>
            <CardContent>
                {fetching ? (
                    <div className="h-10 bg-muted animate-pulse rounded" />
                ) : (
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <Label htmlFor="monthly-goal">Valor da Meta (U$)</Label>
                            <div className="relative mt-1">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="monthly-goal"
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={goal}
                                    onChange={e => setGoal(e.target.value)}
                                    placeholder="Ex: 50000"
                                    className="pl-9"
                                    onKeyDown={e => e.key === "Enter" && handleSave()}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Exibido no card "Meta do Mês" do dashboard.
                            </p>
                        </div>
                        <Button onClick={handleSave} disabled={loading} className="shrink-0">
                            {loading ? "Salvando..." : "Salvar Meta"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
