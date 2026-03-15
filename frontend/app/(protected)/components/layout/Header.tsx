import ButtonLogout from "../button/buttonLogout";

export default function Header() {
  return (
    <header className="h-16 w-full border-b bg-white flex items-center px-6 z-10">
      <h1 className="font-bold">Mon App</h1>
      <ButtonLogout/>
    </header>
  );
}