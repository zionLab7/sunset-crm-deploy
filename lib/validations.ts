import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Senha obrigatória"),
});

export const clientSchema = z.object({
    name: z.string().min(1, "Nome obrigatório"),
    cnpj: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    address: z.string().optional(),
    potentialValue: z.number().min(0, "Valor deve ser positivo"),
});

export const taskSchema = z.object({
    title: z.string().min(1, "Título obrigatório"),
    description: z.string().optional(),
    dueDate: z.date(),
    clientId: z.string(),
});

export const pipelineStageSchema = z.object({
    name: z.string().min(1, "Nome obrigatório"),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor hex inválida"),
    order: z.number().int().min(0),
});
