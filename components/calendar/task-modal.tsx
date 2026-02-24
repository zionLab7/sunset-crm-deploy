"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, X } from "lucide-react";

const taskSchema = z.object({
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
    description: z.string().optional(),
    clientId: z.string().optional().nullable(),
    userId: z.string().optional(), // Vendedor responsável
    dueDate: z.string().min(1, "Data é obrigatória"),
    status: z.enum(["PENDENTE", "ATRASADA", "CONCLUIDA"]),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clients: Array<{ id: string; name: string }>;
    users?: Array<{ id: string; name: string }>; // Lista de vendedores (para gestores)
    currentUserId?: string; // ID do usuário logado
    userRole?: string; // Role do usuário (GESTOR ou VENDEDOR)
    initialData?: Partial<TaskFormData> & { id?: string };
    selectedDate?: Date;
}

export function TaskModal({
    open,
    onClose,
    onSuccess,
    clients,
    users = [],
    currentUserId,
    userRole,
    initialData,
    selectedDate,
}: TaskModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clientSearch, setClientSearch] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            clientId: initialData?.clientId || undefined,
            userId: initialData?.userId || (userRole === "VENDEDOR" ? currentUserId : undefined),
            dueDate: initialData?.dueDate || selectedDate?.toISOString().split("T")[0] || "",
            status: initialData?.status || "PENDENTE",
        },
    });

    const selectedClientId = watch("clientId");
    const selectedUserId = watch("userId");
    const selectedStatus = watch("status");
    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    useEffect(() => {
        if (selectedDate && !initialData) {
            setValue("dueDate", selectedDate.toISOString().split("T")[0]);
        }
    }, [selectedDate, initialData, setValue]);

    useEffect(() => {
        if (open && initialData) {
            reset({
                title: initialData.title || "",
                description: initialData.description || "",
                clientId: initialData.clientId || undefined,
                userId: initialData.userId || (userRole === "VENDEDOR" ? currentUserId : undefined),
                dueDate: initialData.dueDate || "",
                status: initialData.status || "PENDENTE",
            });
        } else if (open && !initialData) {
            reset({
                title: "",
                description: "",
                clientId: undefined,
                userId: userRole === "VENDEDOR" ? currentUserId : undefined,
                dueDate: selectedDate?.toISOString().split("T")[0] || "",
                status: "PENDENTE",
            });
            setClientSearch("");
        }
    }, [open, initialData, selectedDate, reset]);

    const onSubmit = async (data: TaskFormData) => {
        setLoading(true);
        try {
            const url = initialData?.id ? `/api/tasks/${initialData.id}` : "/api/tasks";
            const method = initialData?.id ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    clientId: data.clientId && data.clientId !== "none" ? data.clientId : null,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Erro ao salvar tarefa");
            }

            toast({
                title: initialData?.id ? "✅ Tarefa atualizada!" : "✅ Tarefa criada!",
                description: `${data.title} foi salva com sucesso.`,
            });

            reset();
            onSuccess();
            onClose();
            router.refresh();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar tarefa",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !loading && !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initialData?.id ? "Editar Tarefa" : "Nova Tarefa"}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData?.id
                            ? "Atualize os dados da tarefa."
                            : "Crie uma nova tarefa para você ou para sua equipe."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Título */}
                    <div>
                        <Label htmlFor="title">Título *</Label>
                        <Input
                            id="title"
                            {...register("title")}
                            placeholder="Ex: Ligar para cliente"
                        />
                        {errors.title && (
                            <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                        )}
                    </div>

                    {/* Descrição */}
                    <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Detalhes adicionais..."
                            rows={3}
                        />
                    </div>

                    {/* Cliente — Searchable combobox */}
                    <div>
                        <Label>Cliente (opcional)</Label>
                        <div className="border rounded-md mt-1">
                            {/* Search input */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    className="w-full pl-8 pr-8 py-2 text-sm border-b focus:outline-none focus:ring-0 rounded-t-md bg-background"
                                />
                                {clientSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setClientSearch("")}
                                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {/* Scrollable list */}
                            <div className="max-h-40 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => { setValue("clientId", undefined); setClientSearch(""); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${!selectedClientId ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                                        }`}
                                >
                                    Nenhum cliente
                                </button>
                                {filteredClients.map((client) => (
                                    <button
                                        key={client.id}
                                        type="button"
                                        onClick={() => { setValue("clientId", client.id); setClientSearch(""); }}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedClientId === client.id ? "bg-primary/10 text-primary font-medium" : ""
                                            }`}
                                    >
                                        {client.name}
                                    </button>
                                ))}
                                {filteredClients.length === 0 && (
                                    <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                                )}
                            </div>
                            {/* Selected display */}
                            {selectedClientId && !clientSearch && (
                                <div className="px-3 py-1.5 border-t bg-primary/5 text-xs text-primary flex items-center justify-between">
                                    <span>✓ {clients.find(c => c.id === selectedClientId)?.name}</span>
                                    <button type="button" onClick={() => setValue("clientId", undefined)} className="text-muted-foreground hover:text-destructive">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vendedor Responsável */}
                    {userRole === "GESTOR" && users.length > 0 ? (
                        <div>
                            <Label>Vendedor Responsável *</Label>
                            <Select
                                value={selectedUserId || ""}
                                onValueChange={(value) => setValue("userId", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um vendedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!selectedUserId && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Selecione quem será responsável por esta tarefa
                                </p>
                            )}
                        </div>
                    ) : userRole === "VENDEDOR" ? (
                        <div>
                            <Label>Vendedor Responsável</Label>
                            <Input
                                value={users.find(u => u.id === currentUserId)?.name || "Você"}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Tarefas são automaticamente atribuídas a você
                            </p>
                        </div>
                    ) : null}

                    {/* Data */}
                    <div>
                        <Label htmlFor="dueDate">Data de Vencimento *</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            {...register("dueDate")}
                        />
                        {errors.dueDate && (
                            <p className="text-sm text-red-500 mt-1">{errors.dueDate.message}</p>
                        )}
                    </div>

                    {/* Status */}
                    <div>
                        <Label>Status</Label>
                        <Select
                            value={selectedStatus}
                            onValueChange={(value) =>
                                setValue("status", value as TaskFormData["status"])
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PENDENTE">Pendente</SelectItem>
                                <SelectItem value="ATRASADA">Atrasada</SelectItem>
                                <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData?.id ? "Salvar Alterações" : "Criar Tarefa"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
