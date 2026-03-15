"use client"
import ButtonLogout from "./components/button/buttonLogout";
export default function Home() {

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1>Home</h1>
      <ButtonLogout/>
    </div>
  );
}
