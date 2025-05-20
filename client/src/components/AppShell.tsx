import { ReactNode } from "react";
import Header from "@/components/Header";
import { ClientTrip } from "@/lib/types";

interface AppShellProps {
  children: ReactNode;
  trip?: ClientTrip;
  onOpenShare?: () => void;
}

export default function AppShell({ children, trip, onOpenShare }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen">
      <Header trip={trip} onOpenShare={onOpenShare} />
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {children}
      </main>
    </div>
  );
}
