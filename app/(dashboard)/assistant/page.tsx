"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bot, Send, Sparkles, Loader2, User, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const SUGGESTED_PROMPTS = [
    "Como estão as vendas este mês?",
    "Quais clientes estão sem interação há mais de 30 dias?",
    "Quem é o vendedor com melhor desempenho?",
    "Quais tarefas estão atrasadas?",
    "Me dê insights sobre o funil de vendas",
    "Quais produtos têm mais clientes vinculados?",
];

export default function AssistantPage() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const userRole = (session?.user as any)?.role;

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const sendMessage = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        setError(null);
        setInput("");

        const userMessage: Message = { role: "user", content: text };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    history: messages,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao processar mensagem");
            }

            const assistantMessage: Message = {
                role: "assistant",
                content: data.response,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err: any) {
            setError(err.message);
            // Remove the user message if it failed
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const resetChat = () => {
        setMessages([]);
        setError(null);
        setInput("");
    };

    // Render markdown-like formatting
    const renderContent = (content: string) => {
        // Split content into lines and process
        const lines = content.split("\n");
        const elements: React.ReactNode[] = [];
        let inList = false;
        let listItems: string[] = [];

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="list-disc pl-5 space-y-1 my-2">
                        {listItems.map((item, i) => (
                            <li key={i} className="text-sm">
                                {renderInline(item)}
                            </li>
                        ))}
                    </ul>
                );
                listItems = [];
                inList = false;
            }
        };

        const renderInline = (text: string): React.ReactNode => {
            // Bold **text**
            const parts = text.split(/(\*\*[^*]+\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong key={i} className="font-semibold text-gray-900">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return part;
            });
        };

        lines.forEach((line, idx) => {
            const trimmed = line.trim();

            if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.match(/^\d+\.\s/)) {
                inList = true;
                listItems.push(trimmed.replace(/^[-*]\s|^\d+\.\s/, ""));
                return;
            }

            flushList();

            if (trimmed.startsWith("### ")) {
                elements.push(
                    <h4 key={idx} className="text-sm font-bold text-gray-900 mt-3 mb-1">
                        {renderInline(trimmed.slice(4))}
                    </h4>
                );
            } else if (trimmed.startsWith("## ")) {
                elements.push(
                    <h3 key={idx} className="text-base font-bold text-gray-900 mt-3 mb-1">
                        {renderInline(trimmed.slice(3))}
                    </h3>
                );
            } else if (trimmed === "---") {
                elements.push(
                    <hr key={idx} className="border-gray-200 my-3" />
                );
            } else if (trimmed === "") {
                elements.push(<div key={idx} className="h-2" />);
            } else {
                elements.push(
                    <p key={idx} className="text-sm leading-relaxed">
                        {renderInline(trimmed)}
                    </p>
                );
            }
        });

        flushList();
        return elements;
    };

    if (userRole !== "GESTOR") {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Acesso Restrito</h2>
                    <p className="text-gray-500 mt-2">
                        O Assistente IA está disponível apenas para gestores.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">
                                Assistente IA
                            </h1>
                            <p className="text-xs text-gray-500">
                                Análise inteligente dos dados da Sunset
                            </p>
                        </div>
                    </div>
                    {messages.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetChat}
                            className="text-gray-600"
                        >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Nova conversa
                        </Button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                {messages.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-200 mb-6">
                            <Sparkles className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Olá, {session?.user?.name?.split(" ")[0]}!
                        </h2>
                        <p className="text-gray-500 text-center mb-8 max-w-md">
                            Sou seu assistente de inteligência comercial. Pergunte qualquer
                            coisa sobre vendedores, clientes, pipeline, tarefas e produtos.
                        </p>

                        {/* Suggested prompts */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                            {SUGGESTED_PROMPTS.map((prompt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => sendMessage(prompt)}
                                    className="text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:shadow-md hover:shadow-purple-50 transition-all text-sm text-gray-700 group"
                                >
                                    <span className="text-purple-500 mr-2 group-hover:text-purple-600">
                                        →
                                    </span>
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Chat Messages */
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mt-1">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                            ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                                            : "bg-white border border-gray-200 text-gray-700 shadow-sm"
                                        }`}
                                >
                                    {msg.role === "user" ? (
                                        <p className="text-sm">{msg.content}</p>
                                    ) : (
                                        <div className="prose-sm">
                                            {renderContent(msg.content)}
                                        </div>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-sunset rounded-lg flex items-center justify-center mt-1">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mt-1">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Analisando dados...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="px-6">
                    <div className="max-w-3xl mx-auto mb-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                        ⚠️ {error}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white px-6 py-4">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-end gap-3">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Pergunte sobre vendas, clientes, vendedores..."
                                className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400 max-h-[120px]"
                                rows={1}
                                disabled={isLoading}
                            />
                        </div>
                        <Button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-purple-200 p-0 flex-shrink-0"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        Respostas baseadas nos dados reais do CRM. Pressione Enter para enviar.
                    </p>
                </div>
            </div>
        </div>
    );
}
