import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { ClientTrip } from "@/lib/types";
import React from "react";

// Wrapper components to fix TypeScript issues
const TriggerWithChildren = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Trigger> & { 
    children: React.ReactNode;
    asChild?: boolean;
  }
>((props, ref) => <DropdownMenu.Trigger {...props} ref={ref} />);
TriggerWithChildren.displayName = "TriggerWithChildren";

const ItemWithChildren = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Item> & { 
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }
>((props, ref) => <DropdownMenu.Item {...props} ref={ref} />);
ItemWithChildren.displayName = "ItemWithChildren";

const SeparatorWithClassName = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Separator> & { className?: string }
>((props, ref) => <DropdownMenu.Separator {...props} ref={ref} />);
SeparatorWithClassName.displayName = "SeparatorWithClassName";

interface HeaderProps {
  trip?: ClientTrip;
  onOpenShare?: () => void;
  onToggleSidebar?: () => void;
  onRenameTrip?: () => void;
  onDuplicateTrip?: () => void;
  onExportPDF?: () => void;
  onDeleteTrip?: () => void;
}

export default function Header({ 
  trip, 
  onOpenShare,
  onToggleSidebar,
  onRenameTrip,
  onDuplicateTrip,
  onExportPDF,
  onDeleteTrip
}: HeaderProps) {
  const [, setLocation] = useLocation();
  
  return (
    <header className="bg-white dark:bg-[hsl(var(--card))] shadow-sm z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div 
            className="flex items-center cursor-pointer" 
            onClick={() => setLocation('/')}
          >
            <div className="h-8 w-8 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[hsl(var(--foreground))]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="ml-2 text-xl font-semibold">NestMap</h1>
          </div>
          <span className="hidden md:block text-sm text-[hsl(var(--muted-foreground))]">Plan. Pin. Wander.</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            id="toggleSidebar"
            variant="ghost"
            size="icon"
            className="md:hidden text-[hsl(var(--primary))]"
            aria-label="Toggle Sidebar"
            onClick={onToggleSidebar}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          
          {trip && (
            <>
              <Button
                variant="ghost"
                className="hidden md:flex items-center text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"
                onClick={onOpenShare}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
                </svg>
                <span>Share</span>
              </Button>
              
              <DropdownMenu.Root>
                <TriggerWithChildren asChild>
                  <Button variant="ghost" size="icon" aria-label="Trip Options">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
                </TriggerWithChildren>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="min-w-[200px] bg-white rounded-md p-1 shadow-lg z-50" align="end" sideOffset={5}>
                    <ItemWithChildren 
                      className={cn(
                        "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none",
                        "hover:bg-gray-100 focus:bg-gray-100",
                        "md:hidden"
                      )}
                      onClick={onOpenShare}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span>Share Trip</span>
                    </ItemWithChildren>
                    <ItemWithChildren 
                      className={cn(
                        "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none",
                        "hover:bg-gray-100 focus:bg-gray-100"
                      )}
                      onClick={onRenameTrip}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Rename Trip</span>
                    </ItemWithChildren>
                    <ItemWithChildren 
                      className={cn(
                        "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none",
                        "hover:bg-gray-100 focus:bg-gray-100"
                      )}
                      onClick={onDuplicateTrip}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Duplicate Trip</span>
                    </ItemWithChildren>
                    <ItemWithChildren 
                      className={cn(
                        "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none",
                        "hover:bg-gray-100 focus:bg-gray-100"
                      )}
                      onClick={onExportPDF}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Export as PDF</span>
                    </ItemWithChildren>
                    <SeparatorWithClassName className="h-px bg-gray-200 m-1" />
                    <ItemWithChildren 
                      className={cn(
                        "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none text-red-600",
                        "hover:bg-red-50 focus:bg-red-50"
                      )}
                      onClick={onDeleteTrip}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Trip</span>
                    </ItemWithChildren>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
