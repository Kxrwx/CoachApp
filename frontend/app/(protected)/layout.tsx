import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import { AccountProvider } from "./contexts/AccountProvider";

export default function RootLayoutProtected({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AccountProvider>
      <div className="flex flex-col h-screen w-full overflow-hidden">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />

          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </AccountProvider>
  );
}