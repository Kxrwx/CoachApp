"use client"
import { useState } from "react"
import {UserSignIn} from "../../lib/shema"
import { UserSignUp } from "../../lib/shema";
import axios from "axios";
import { useRouter } from "next/navigation";
import { getOrGenerateDeviceId } from "@/lib/bib";
import { useAccount } from "../(protected)/contexts/AccountProvider";

export default function AuthPage() {
    const [signIn, setSignIn] = useState<boolean>(true);
    const[emailSign, setEmailSign] = useState("")
    const[passwordSign, setPasswordSign] = useState("")
    const[mfaSign, setMfaSign] = useState("")
    const [errors, setErrors] = useState<string[]>([]);
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const deviceId = getOrGenerateDeviceId();

    if (signIn) {
        const format = UserSignIn.safeParse({
            email: emailSign,
            password: passwordSign,
        });

        if (!format.success) {
          setErrors(Object.values(format.error.flatten().fieldErrors).flat().filter(Boolean));
          return;
        }

        try {
            const reponse = await axios.post("/api/auth/signin", {
                emailSign,
                passwordSign,
                deviceId
            });
            if (reponse) {
              return router.replace("/");
            }
        } 
        catch (err: unknown) {
    if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
            setErrors([err.response.data.error]);
        } else {
            setErrors([err.message]);
        }
    } else if (err instanceof Error) {
        setErrors([err.message]);
    } else {
        setErrors(["Erreur inconnue"]);
    }
}
    } 
    else { 
        const format = UserSignUp.safeParse({
            email: emailSign, 
            password: passwordSign
        });

        if (!format.success) {
          setErrors(Object.values(format.error.flatten().fieldErrors).flat().filter(Boolean));
          return;
        }

        try {
            const reponse = await axios.post("/api/auth/signup", {
                emailSign,
                passwordSign,
                mfaSign,
                deviceId
            });
            if(reponse.status == 401) setErrors(["Erreur login"])
            alert("Compte créé !");
            if (reponse) {
              return router.replace("/");
            } 
        }
         catch (err: unknown) {
    if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
            setErrors([err.response.data.error]);
        } else {
            setErrors([err.message]);
        }
    } else if (err instanceof Error) {
        setErrors([err.message]);
    } else {
        setErrors(["Erreur inconnue"]);
    }
}
    }
}


    return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
              <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  {signIn ? "Connexion" : "Créer un compte"}
    </h2>
  </div>

  <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="emailSign"
            onChange={(e) => setEmailSign(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="vous@exemple.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
          <input
            type="password"
            name="passwordSign"
            onChange={(e) => setPasswordSign(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {!signIn && (
          <div className="flex items-center">
            <input
              id="mfa"
              type="checkbox"
              name="mfaSign"
              onChange={(e) => setMfaSign(e.target.checked ? "true" : "false")}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="mfa" className="ml-2 block text-sm text-gray-900">
              Activer l'authentification forte (MFA)
            </label>
          </div>
        )}

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          {signIn ? "Se connecter" : "S'inscrire"}
        </button>
        
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou</span>
          </div>
        </div>

        <button
          onClick={() => setSignIn(!signIn)}
          className="mt-6 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          {signIn ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
        {errors && errors.length > 0 && (
          <div className="mt-2">
            {errors.map((err, i) => (
              <span key={i} className="text-red-500 text-sm block">
              {err}
              </span>
              ))}
          </div>
          )}

      </div>
    </div>
  </div>
</div>
        
        
    )
}
