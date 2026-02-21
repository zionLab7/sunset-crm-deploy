"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Save, ExternalLink, Bot, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function IntegrationsTab() {
    const [pabxUrl, setPabxUrl] = useState("");
    const [geminiKey, setGeminiKey] = useState("");
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingPabx, setSavingPabx] = useState(false);
    const [savingGemini, setSavingGemini] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const [pabxRes, geminiRes] = await Promise.all([
                fetch("/api/admin/system-config?key=pabxUrlTemplate"),
                fetch("/api/admin/system-config?key=geminiApiKey"),
            ]);
            const pabxData = await pabxRes.json();
            const geminiData = await geminiRes.json();
            if (pabxData.config?.value) setPabxUrl(pabxData.config.value);
            if (geminiData.config?.value) setGeminiKey(geminiData.config.value);
        } catch (error) {
            console.error("Erro ao carregar configuração:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (key: string, value: string, setLoading: (v: boolean) => void, label: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/system-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erro ao salvar");
            }

            toast({
                title: "✅ Configuração salva!",
                description: `${label} atualizada com sucesso.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Gemini AI */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Inteligência Artificial (Gemini)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="geminiKey">Chave da API Google Gemini</Label>
                        <div className="flex gap-2 mt-1">
                            <div className="relative flex-1">
                                <Input
                                    id="geminiKey"
                                    type={showGeminiKey ? "text" : "password"}
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                                >
                                    {showGeminiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Necessária para o Assistente de IA funcionar. Obtenha em{" "}
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                            >
                                Google AI Studio
                            </a>
                            .
                        </p>
                    </div>

                    <Button
                        onClick={() => handleSaveConfig("geminiApiKey", geminiKey, setSavingGemini, "Chave do Gemini")}
                        disabled={savingGemini}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {savingGemini ? "Salvando..." : "Salvar Chave"}
                    </Button>
                </CardContent>
            </Card>

            {/* PABX / Telefonia */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Telefonia (PABX)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="pabxUrl">URL do PABX para Ligações</Label>
                        <Input
                            id="pabxUrl"
                            value={pabxUrl}
                            onChange={(e) => setPabxUrl(e.target.value)}
                            placeholder="https://meu-pabx.com/call?number={phone}"
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Use <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{"{phone}"}</code> como
                            placeholder para o número do cliente. O número será inserido
                            automaticamente sem formatação (apenas dígitos).
                        </p>
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Exemplo:</p>
                            <div className="flex items-center gap-2 text-xs">
                                <ExternalLink className="h-3 w-3" />
                                <span className="font-mono text-muted-foreground">
                                    {pabxUrl
                                        ? pabxUrl.replace("{phone}", "11999998888")
                                        : "Configure a URL acima"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => handleSaveConfig("pabxUrlTemplate", pabxUrl, setSavingPabx, "URL do PABX")}
                        disabled={savingPabx}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {savingPabx ? "Salvando..." : "Salvar Configuração"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
