import { ArrowRight} from "lucide-react"
import { faStrava } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function ButtonStravaConnect() {

    async function handleSubmit (){


        const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
        const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
        const redirectUri = `${baseUrl}/api/me/strava/OAuth`; 
        const scope = "read,profile:read_all,activity:read_all";

        const stravaUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
        
        try {
            window.location.assign(stravaUrl)
        } catch (error) {
            alert("Erreur lors de la connexion")
        }
        


    }


    return (
        <button
  onClick={handleSubmit}
  className="group relative flex items-center gap-3 bg-[#FC4C02] hover:bg-[#E34402] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
>
  {/* Icône optionnelle : un petit cercle blanc pour simuler un logo sport */}
  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
    <FontAwesomeIcon icon={faStrava} />
  </span>
  
  <span>Connexion à Strava</span>
  
  {/* Flèche qui bouge au survol */}
  <ArrowRight 
    size={16} 
    className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
  />
</button>
    )
}