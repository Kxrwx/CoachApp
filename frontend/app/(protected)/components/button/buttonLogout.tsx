"use client"
import axios from "axios"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react" 

export default function ButtonLogout() {
    const route = useRouter()

    async function logout() {
        try {
            const response = await axios.get("/api/me/logout", {
                withCredentials: true
            })
            if (response.status === 200) {
                return route.replace("/auth")
            }
        } catch (error) {
            console.error("Logout error:", error)
            alert("Erreur lors de la déconnexion")
        }
    }

    return (
        <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 transition-colors duration-200 rounded-lg hover:bg-red-50 active:bg-red-100 w-full group"
        >
            <LogOut size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Déconnexion</span>
        </button>
    )
}