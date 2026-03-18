import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const cookieStore = await cookies();
        const sessionToken = cookieStore.get("session_token")?.value;
        const response = await axios.post(`${process.env.BACKEND_URL}/training/delete`, 
            { id: id }, 
            {
                headers: { Cookie: `session_token=${sessionToken}` },
                withCredentials: true
            }
        );

        return NextResponse.json(response.data);
    } catch (err: any) {
        console.error("Erreur API Route Next:", err.message);
        return NextResponse.json({ error: "Activite introuvable" }, { status: 404 });
    }
}