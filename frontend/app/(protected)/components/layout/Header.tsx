import ButtonLogout from "../button/buttonLogout";

export default function Header() {
  return (
    <header className="h-16 w-full border-b bg-white flex items-center justify-between px-8 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black">
          M
        </div>
        <h1 className="font-bold text-xl tracking-tight text-gray-800">
          Mon App
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <ButtonLogout />
      </div>
    </header>
  );
}