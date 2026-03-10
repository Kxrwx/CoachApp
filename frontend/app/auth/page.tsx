"use client"
import { useState } from "react"

import {UserSignIn} from "../shema"
import { UserSignUp } from "../shema";

export default function AuthPage() {
    const [signIn, setSignIn] = useState(true);
    const[emailSign, setEmailSign] = useState("")
    const[passwordSign, setPasswordSign] = useState("")
    const[mfaSign, setMfaSign] = useState("")
    

    function handleSubmit() {
        if(signIn){
            const format = UserSignIn.safeParse({
                email : emailSign,
                password : passwordSign,
                mfa : mfaSign
            })
            if(!format.success){
                alert(format.error)
                return(false)
            }
                
            else{
                const req = fetch("/api/auth/signin")
            }

        if(!signIn){
            const format = UserSignUp.safeParse({
                email : emailSign, 
                passxord : passwordSign
            })
        }
    }
    }


    return (
        <div>
            signIn ? (
            <div>
                <form onSubmit={handleSubmit}>
                    <input name="emailSign" onChange={(e)=>setEmailSign(e.target.value)}/>
                    <input name="passwordSign" onChange={(e)=>setPasswordSign(e.target.value)}/>
                    <button type="submit">S'inscrir</button>
                    <button onClick={()=> setSignIn(false)}>SignIn</button>
                </form>

            </div>
        ):(
            <div>
                <form onSubmit={handleSubmit}>
                    <input name="emailSign" onChange={(e)=>setEmailSign(e.target.value)}/>
                    <input name="passwordSign" onChange={(e)=>setPasswordSign(e.target.value)}/>
                    <input  type="checkbox" name="mfaSign" onChange={(e)=>setMfaSign(e.target.value)}/>

                    <button type="submit">S'inscrir</button>
                    <button onClick={()=> setSignIn(true)}>SignUp</button>

                </form>

            </div>
        )
        </div>
        
        
    )
}
