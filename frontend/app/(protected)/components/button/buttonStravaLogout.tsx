"use client"
import axios from "axios"
import { useRouter } from "next/navigation"
import { LogOut} from "lucide-react"
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


export default function ButtonStravaLogout() {
    const route = useRouter()

    async function handleSubmit() {
        try {
            const response = await axios.get("/api/me/strava/logout", {
                withCredentials: true
            })
            if (response.status === 200) {
                return route.refresh
            }
        } catch (error) {
            alert("Erreur lors de la déconnexion")
        }
    }


    return (
<button
  onClick={handleSubmit}
  className="group flex items-center gap-3 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-700 hover:text-red-600 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm active:scale-95"
>
  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-red-100 transition-colors">
    <FontAwesomeIcon 
      icon={faStrava} 
      className="text-[#FC4C02] group-hover:text-red-600 transition-colors" 
    />
  </div>
  
  <span className="flex-1 text-left">Déconnecter Strava</span>

  <LogOut 
    size={16} 
    className="text-gray-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" 
  />
</button>
    )
}