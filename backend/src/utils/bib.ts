export function sanitizeIP(ip : string){
    if(!ip) return null
    const parts = ip.split(".")
    if (parts.length !== 4) return null
    if (parts.some(p=> isNaN(Number(p)) || Number(p) < 0 || Number(p) > 255)) return null
    return ip
}