export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-white h-full flex-shrink-0">
      <nav className="p-4">
        <ul className="space-y-2">
          <li className="p-2 hover:bg-gray-100 rounded">Dashboard</li>
          <li className="p-2 hover:bg-gray-100 rounded">Projets</li>
        </ul>
      </nav>
    </aside>
  );
}