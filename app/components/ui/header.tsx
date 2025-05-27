import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from "../../lib/utils";
import { Button } from './button';
import ApiStatus from '../Common/ApiStatus';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b bg-background shadow-sm",
      className
    )}>
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-8">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-md flex items-center justify-center font-bold text-sm">
            FS
          </div>
          <span className="hidden text-xl font-bold sm:inline-block">
            Freshservice Dashboard
          </span>
        </div>
        
        <nav className="flex flex-1 items-center justify-end space-x-4">
          <Button variant="ghost" asChild className="text-foreground hover:bg-accent">
            <Link to="/">Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild className="text-foreground hover:bg-accent">
            <Link to="/tickets">Tickets</Link>
          </Button>
          <Button variant="ghost" asChild className="text-foreground hover:bg-accent">
            <Link to="/assets">Assets</Link>
          </Button>
          <Button variant="ghost" asChild className="text-foreground hover:bg-accent">
            <Link to="/agents">Agents</Link>
          </Button>
        </nav>
        
        <div className="ml-4 flex items-center space-x-4">
          <ApiStatus />
          <Button variant="outline" size="sm" className="border-input hover:bg-accent">
            Settings
          </Button>
        </div>
      </div>
    </header>
  );
} 