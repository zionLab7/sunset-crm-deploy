"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Task {
    id: string;
    title: string;
    status: string;
    dueDate: string;
    client?: {
        name: string;
    };
}

interface CalendarViewProps {
    tasks: Task[];
    onDayClick: (date: Date) => void;
}

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-blue-500",
    OVERDUE: "bg-red-500",
    COMPLETED: "bg-green-500",
};

export function CalendarView({ tasks, onDayClick }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Calculate days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Build calendar grid
    const calendarDays: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarDays.push({
            date: new Date(year, month - 1, daysInPrevMonth - i),
            isCurrentMonth: false,
        });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({
            date: new Date(year, month, i),
            isCurrentMonth: true,
        });
    }

    // Next month days to complete grid
    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
        calendarDays.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false,
        });
    }

    // Group tasks by date
    const tasksByDate = tasks.reduce((acc, task) => {
        const date = new Date(task.dueDate).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (date: Date | null) => {
        if (!date) return false;
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                    {MONTHS[month]} {year}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleToday}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Hoje
                    </Button>
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card>
                <CardContent className="p-4">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {WEEKDAYS.map((day) => (
                            <div
                                key={day}
                                className="text-center text-sm font-semibold text-muted-foreground py-2"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, index) => {
                            const dayTasks = day.date ? tasksByDate[day.date.toDateString()] || [] : [];
                            const isCurrentDay = isToday(day.date);

                            return (
                                <div
                                    key={index}
                                    onClick={() => day.date && onDayClick(day.date)}
                                    className={`
                    min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                    ${day.isCurrentMonth ? "bg-card hover:bg-accent/50" : "bg-muted/30"}
                    ${isCurrentDay ? "ring-2 ring-primary" : ""}
                  `}
                                >
                                    <div className={`
                    text-sm font-medium mb-1
                    ${day.isCurrentMonth ? "" : "text-muted-foreground/50"}
                    ${isCurrentDay ? "text-primary font-bold" : ""}
                  `}>
                                        {day.date?.getDate()}
                                    </div>

                                    {/* Task dots */}
                                    <div className="space-y-1">
                                        {dayTasks.slice(0, 3).map((task) => (
                                            <div
                                                key={task.id}
                                                className={`
                          h-1.5 w-full rounded-full
                          ${STATUS_COLORS[task.status] || "bg-gray-400"}
                        `}
                                                title={task.title}
                                            />
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="text-xs text-muted-foreground text-center">
                                                +{dayTasks.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
