import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user;
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }
    return user;
}

export async function requireRole(role: "GESTOR" | "VENDEDOR") {
    const user = await requireAuth();
    if ((user as any).role !== role) {
        redirect("/dashboard");
    }
    return user;
}
