"use client";

import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
}

export function useConfirm() {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({
        description: "",
    });
    const [resolveReject, setResolveReject] = useState<{
        resolve: (value: boolean) => void;
    } | null>(null);

    const confirm = (opts: ConfirmOptions): Promise<boolean> => {
        setOptions({
            title: opts.title || "Confirmar Ação",
            description: opts.description,
            confirmText: opts.confirmText || "Confirmar",
            cancelText: opts.cancelText || "Cancelar",
        });
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            setResolveReject({ resolve });
        });
    };

    const handleConfirm = () => {
        resolveReject?.resolve(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        resolveReject?.resolve(false);
        setIsOpen(false);
    };

    const ConfirmDialog = () => (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{options.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {options.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>
                        {options.cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
                        {options.confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return { confirm, ConfirmDialog };
}
