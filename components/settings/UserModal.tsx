"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const userSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
    role: z.enum(["VENDEDOR", "GESTOR"]),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        id: string;
        name: string;
        email: string;
        role: "VENDEDOR" | "GESTOR";
    };
}

export function UserModal({
    open,
    onClose,
    onSuccess,
    initialData,
}: UserModalProps) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<"VENDEDOR" | "GESTOR">("VENDEDOR");

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "VENDEDOR",
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    name: initialData.name,
                    email: initialData.email,
                    password: "", // Senha vazia ao editar
                    role: initialData.role,
                });
                setRole(initialData.role);
            } else {
                reset({
                    name: "",
                    email: "",
                    password: "",
                    role: "VENDEDOR",
                });
                setRole("VENDEDOR");
            }
        }
    }, [open, initialData, reset]);

    const onSubmit = async (data: UserFormData) => {
        setLoading(true);
        try {
            const payload: any = {
                name: data.name,
                email: data.email,
                role: data.role,
            };

            // Adicionar senha apenas se preenchida
            if (data.password && data.password.trim() !== "") {
                payload.password = data.password;
            } else if (!initialData?.id) {
                // Senha obrigatória ao criar novo usuário
                throw new Error("Senha é obrigatória ao criar novo usuário");
            }

            const url = initialData?.id
                ? `/api/admin/users/${initialData.id}`
                : "/api/admin/users";

            const method = initialData?.id ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error || "Erro ao salvar usuário");
            }

            toast({
                title: initialData?.id ? "✅ Usuário atualizado!" : "✅ Usuário criado!",
                description: `${data.name} foi salvo com sucesso.`,
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar usuário",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {initialData?.id ? "Editar Usuário" : "Novo Usuário"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Nome */}
                    <div>
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                            id="name"
                            {...register("name")}
                            placeholder="Ex: João Silva"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            {...register("email")}
                            placeholder="joao@empresa.com"
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Senha */}
                    <div>
                        <Label htmlFor="password">
                            Senha {!initialData?.id && "*"}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            {...register("password")}
                            placeholder={initialData?.id ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                        />
                        {errors.password && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.password.message}
                            </p>
                        )}
                        {initialData?.id && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Deixe em branco para manter a senha atual
                            </p>
                        )}
                    </div>

                    {/* Role */}
                    <div>
                        <Label htmlFor="role">Cargo *</Label>
                        <Select
                            value={role}
                            onValueChange={(value: "VENDEDOR" | "GESTOR") => {
                                setRole(value);
                                setValue("role", value);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                                <SelectItem value="GESTOR">Gestor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading
                                ? "Salvando..."
                                : initialData?.id
                                    ? "Atualizar"
                                    : "Criar Usuário"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
