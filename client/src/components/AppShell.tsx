import { ReactNode } from "react";
import Header from "@/components/Header";
import { ClientTrip } from "@/lib/types";

interface AppShellProps {
  children: ReactNode;
  trip?: ClientTrip;
  onOpenShare?: () => void;
  onCreateTemplate?: () => void;
}

export default function AppShell({ children, trip, onOpenShare, onCreateTemplate }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen">
      <Header trip={trip} onOpenShare={onOpenShare} onCreateTemplate={onCreateTemplate} />
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden main-content">
        {/* We wrap the children in a div with a specific layout to control the sidebar and map */}
        <div className="flex flex-col md:flex-row w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
