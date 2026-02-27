"use client";

import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Upload,
    FileSpreadsheet,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// CRM fields available for mapping
const CRM_FIELDS = [
    { key: "name", label: "Nome *", required: true },
    { key: "cnpj", label: "CNPJ", required: false },
    { key: "phone", label: "Telefone", required: false },
    { key: "email", label: "Email", required: false },
    { key: "potentialValue", label: "Valor Potencial (R$)", required: false },
];

interface ImportClientsModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    stages: Array<{ id: string; name: string; color: string }>;
    users: Array<{ id: string; name: string }>;
}

type Step = "upload" | "map" | "confirm" | "result";

interface ImportResult {
    created: number;
    skipped: number;
    total: number;
    errors: string[];
}

export function ImportClientsModal({
    open,
    onClose,
    onSuccess,
    stages,
    users,
}: ImportClientsModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<any[][]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [stageId, setStageId] = useState("");
    const [assignedUserId, setAssignedUserId] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [customFieldDefs, setCustomFieldDefs] = useState<Array<{ id: string; name: string }>>([]);

    // Reset on open
    useEffect(() => {
        if (open) {
            setStep("upload");
            setFile(null);
            setHeaders([]);
            setRows([]);
            setMapping({});
            setStageId(stages[0]?.id || "");
            setAssignedUserId("");
            setResult(null);
            // Fetch custom CLIENT fields for column mapping
            fetch("/api/custom-fields?entityType=CLIENT")
                .then(r => r.json())
                .then(d => setCustomFieldDefs((d.customFields || []).filter((f: any) => f.fieldType !== "calculated").map((f: any) => ({ id: f.id, name: f.name }))))
                .catch(() => { });
        }
    }, [open, stages]);

    const handleFileUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const uploadedFile = e.target.files?.[0];
            if (!uploadedFile) return;

            setFile(uploadedFile);

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: "array" });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                        header: 1,
                    }) as any[][];

                    if (jsonData.length < 2) {
                        toast({
                            variant: "destructive",
                            title: "Planilha vazia",
                            description:
                                "A planilha precisa ter pelo menos um cabeçalho e uma linha de dados.",
                        });
                        return;
                    }

                    const fileHeaders = jsonData[0].map((h: any) =>
                        String(h || "").trim()
                    );
                    const fileRows = jsonData.slice(1).filter((row) =>
                        row.some((cell: any) => cell !== null && cell !== undefined && cell !== "")
                    );

                    setHeaders(fileHeaders);
                    setRows(fileRows);

                    // Auto-map columns by name similarity
                    const autoMapping: Record<string, string> = {};
                    CRM_FIELDS.forEach((field) => {
                        const matchIdx = fileHeaders.findIndex((h: string) => {
                            const headerLower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            const fieldLower = field.label
                                .toLowerCase()
                                .replace(" *", "")
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "");
                            return (
                                headerLower === fieldLower ||
                                headerLower.includes(fieldLower) ||
                                fieldLower.includes(headerLower) ||
                                headerLower === field.key.toLowerCase()
                            );
                        });
                        if (matchIdx >= 0) {
                            autoMapping[field.key] = matchIdx.toString();
                        }
                    });

                    setMapping(autoMapping);
                    setStep("map");
                } catch {
                    toast({
                        variant: "destructive",
                        title: "Erro ao ler arquivo",
                        description:
                            "Não foi possível ler o arquivo. Verifique se é um CSV ou XLSX válido.",
                    });
                }
            };
            reader.readAsArrayBuffer(uploadedFile);
        },
        []
    );

    const handleImport = async () => {
        // Validate required fields are mapped
        const nameMapping = mapping["name"];
        if (nameMapping === undefined || nameMapping === "") {
            toast({
                variant: "destructive",
                title: "Campo obrigatório",
                description: 'O campo "Nome" deve ser mapeado para uma coluna.',
            });
            return;
        }

        if (!stageId) {
            toast({
                variant: "destructive",
                title: "Fase obrigatória",
                description: "Selecione uma fase do pipeline para os clientes importados.",
            });
            return;
        }

        setLoading(true);

        try {
            // Build client objects from mapped data
            const clients = rows.map((row) => {
                const client: Record<string, any> = {};
                const customFields: Record<string, string> = {};
                Object.entries(mapping).forEach(([fieldKey, colIdx]) => {
                    if (colIdx !== "" && colIdx !== undefined) {
                        const val = row[parseInt(colIdx)];
                        if (fieldKey.startsWith("cf_")) {
                            // Custom field
                            const cfId = fieldKey.replace("cf_", "");
                            if (val !== null && val !== undefined && val !== "") {
                                customFields[cfId] = String(val);
                            }
                        } else {
                            client[fieldKey] = val;
                        }
                    }
                });
                if (Object.keys(customFields).length > 0) {
                    client.customFields = customFields;
                }
                return client;
            });

            const res = await fetch("/api/clients/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clients,
                    currentStageId: stageId,
                    assignedUserId: assignedUserId || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao importar");
            }

            setResult(data);
            setStep("result");

            if (data.created > 0) {
                onSuccess();
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Erro na importação",
                description: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const previewRows = rows.slice(0, 5);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Importar Clientes via Planilha
                    </DialogTitle>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="flex items-center gap-2 mb-4">
                    {(["upload", "map", "confirm", "result"] as Step[]).map(
                        (s, idx) => (
                            <div key={s} className="flex items-center gap-2">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s
                                        ? "bg-primary text-primary-foreground"
                                        : idx <
                                            ["upload", "map", "confirm", "result"].indexOf(step)
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-200 text-gray-500"
                                        }`}
                                >
                                    {idx <
                                        ["upload", "map", "confirm", "result"].indexOf(step) ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                {idx < 3 && (
                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                )}
                            </div>
                        )
                    )}
                    <span className="text-sm text-muted-foreground ml-2">
                        {step === "upload" && "Enviar Arquivo"}
                        {step === "map" && "Mapear Colunas"}
                        {step === "confirm" && "Confirmar"}
                        {step === "result" && "Resultado"}
                    </span>
                </div>

                {/* STEP 1: Upload */}
                {step === "upload" && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary transition-colors">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-sm text-gray-600 mb-2">
                                Arraste ou clique para selecionar uma planilha
                            </p>
                            <p className="text-xs text-gray-400 mb-4">
                                Formatos suportados: CSV, XLSX, XLS
                            </p>
                            <label>
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button
                                    variant="outline"
                                    className="cursor-pointer"
                                    asChild
                                >
                                    <span>Selecionar Arquivo</span>
                                </Button>
                            </label>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-700">
                                <strong>Dica:</strong> A primeira linha da planilha deve conter
                                os nomes das colunas (cabeçalho). O sistema tentará mapear
                                automaticamente as colunas.
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP 2: Map Columns */}
                {step === "map" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                <strong>{rows.length}</strong> linhas encontradas em{" "}
                                <strong>{file?.name}</strong>
                            </p>
                        </div>

                        {/* Column Mapping */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">
                                Mapeamento de Colunas
                            </Label>
                            {/* Standard CRM fields */}
                            {CRM_FIELDS.map((field) => (
                                <div
                                    key={field.key}
                                    className="flex items-center gap-3"
                                >
                                    <div className="w-40 text-sm font-medium truncate">
                                        {field.label}
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <Select
                                        value={mapping[field.key] || "__none__"}
                                        onValueChange={(val) =>
                                            setMapping((prev) => ({
                                                ...prev,
                                                [field.key]:
                                                    val === "__none__" ? "" : val,
                                            }))
                                        }
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="— Não mapear —" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                — Não mapear —
                                            </SelectItem>
                                            {headers.map((h, idx) => (
                                                <SelectItem
                                                    key={idx}
                                                    value={idx.toString()}
                                                >
                                                    {h}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}

                            {/* Dynamic custom CLIENT fields */}
                            {customFieldDefs.length > 0 && (
                                <>
                                    <div className="pt-2 border-t">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                            📋 Campos Adicionais
                                        </p>
                                    </div>
                                    {customFieldDefs.map((cf) => (
                                        <div key={`cf_${cf.id}`} className="flex items-center gap-3">
                                            <div className="w-40 text-sm font-medium truncate text-blue-700">
                                                {cf.name}
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <Select
                                                value={mapping[`cf_${cf.id}`] || "__none__"}
                                                onValueChange={(val) =>
                                                    setMapping((prev) => ({
                                                        ...prev,
                                                        [`cf_${cf.id}`]: val === "__none__" ? "" : val,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="— Não mapear —" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">— Não mapear —</SelectItem>
                                                    {headers.map((h, idx) => (
                                                        <SelectItem key={idx} value={idx.toString()}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Stage + User Selection */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                                <Label className="text-sm">Fase do Pipeline *</Label>
                                <Select
                                    value={stageId}
                                    onValueChange={setStageId}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map((stage) => (
                                            <SelectItem
                                                key={stage.id}
                                                value={stage.id}
                                            >
                                                {stage.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-sm">
                                    Vendedor Responsável
                                </Label>
                                <Select
                                    value={assignedUserId || "__auto__"}
                                    onValueChange={(val) =>
                                        setAssignedUserId(
                                            val === "__auto__" ? "" : val
                                        )
                                    }
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__auto__">
                                            Eu mesmo (atual)
                                        </SelectItem>
                                        {users.map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div>
                            <Label className="text-sm font-semibold">
                                Preview (primeiras {previewRows.length} linhas)
                            </Label>
                            <div className="mt-2 border rounded-lg overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            {headers.map((h, i) => (
                                                <th
                                                    key={i}
                                                    className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewRows.map((row, rIdx) => (
                                            <tr
                                                key={rIdx}
                                                className="border-t"
                                            >
                                                {headers.map((_, cIdx) => (
                                                    <td
                                                        key={cIdx}
                                                        className="px-3 py-1.5 text-gray-700 whitespace-nowrap"
                                                    >
                                                        {row[cIdx] ?? "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setStep("upload")}
                            >
                                Voltar
                            </Button>
                            <Button onClick={() => setStep("confirm")}>
                                Continuar
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Confirm */}
                {step === "confirm" && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-amber-800 text-sm">
                                        Confirmar Importação
                                    </p>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Serão importados até{" "}
                                        <strong>{rows.length} clientes</strong> do
                                        arquivo{" "}
                                        <strong>{file?.name}</strong>.
                                    </p>
                                    <p className="text-xs text-amber-600 mt-2">
                                        • Clientes com CNPJ já cadastrado serão
                                        ignorados
                                        <br />
                                        • Fase:{" "}
                                        <strong>
                                            {stages.find((s) => s.id === stageId)
                                                ?.name || "—"}
                                        </strong>
                                        <br />• Mapeamentos:{" "}
                                        {Object.entries(mapping)
                                            .filter(([, v]) => v !== "")
                                            .map(
                                                ([k]) =>
                                                    CRM_FIELDS.find(
                                                        (f) => f.key === k
                                                    )?.label
                                            )
                                            .join(", ")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setStep("map")}
                            >
                                Voltar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Importar {rows.length} Clientes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Result */}
                {step === "result" && result && (
                    <div className="space-y-4">
                        <div
                            className={`rounded-lg p-6 text-center ${result.created > 0
                                ? "bg-green-50 border border-green-200"
                                : "bg-red-50 border border-red-200"
                                }`}
                        >
                            {result.created > 0 ? (
                                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                            ) : (
                                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                            )}
                            <h3 className="text-lg font-bold">
                                {result.created > 0
                                    ? "Importação Concluída!"
                                    : "Nenhum Cliente Importado"}
                            </h3>
                            <div className="flex justify-center gap-6 mt-4 text-sm">
                                <div>
                                    <p className="text-2xl font-bold text-green-600">
                                        {result.created}
                                    </p>
                                    <p className="text-gray-500">Criados</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-amber-600">
                                        {result.skipped}
                                    </p>
                                    <p className="text-gray-500">Ignorados</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-600">
                                        {result.total}
                                    </p>
                                    <p className="text-gray-500">Total</p>
                                </div>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3 max-h-36 overflow-y-auto">
                                <p className="text-xs font-semibold text-gray-600 mb-2">
                                    Detalhes:
                                </p>
                                {result.errors.map((err, idx) => (
                                    <p
                                        key={idx}
                                        className="text-xs text-gray-500 py-0.5"
                                    >
                                        • {err}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={onClose}>Fechar</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
