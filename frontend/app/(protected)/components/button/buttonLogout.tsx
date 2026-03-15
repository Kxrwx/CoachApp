"use client"
import axios from "axios"
import { useRouter } from "next/navigation"




export default function ButtonLogout(){

    const route = useRouter()   

    async function logout() {
        const response = await axios.get("/api/me/logout", {
            withCredentials : true
        })
        if (response) return route.replace("/auth")
        return alert("erreur")
    }

    return(
        <button onClick={logout}>
            Logout
        </button>
    )
}