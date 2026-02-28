"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bell,
    UserCircle,
    Folder,
    Map as MapIcon,
    Landmark,
    Search,
    Home,
    Scale,
    Library
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const isHome = pathname === "/dashboard";
    const isUpload = pathname === "/dashboard/upload";
    const isLibrary = pathname === "/dashboard/library";

    return (
        <div className="h-screen bg-background font-sans selection:bg-primary/20 flex overflow-hidden">
            {/* Left Sidebar - Entire column light grey */}
            <aside className="w-72 bg-muted/30 border-r border-border/50 flex flex-col shrink-0 overflow-y-auto">
                {/* Logo Area (replaces top left header) */}
                <div className="h-16 flex items-center px-8 border-b border-border/50 shrink-0 bg-background/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            <Scale className="w-4.5 h-4.5" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Lex AI</span>
                    </div>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 p-6 flex flex-col gap-8">
                    {/* User Profile */}
                    <div className="flex items-center gap-4 px-2 py-3 mb-2 rounded-2xl">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50">
                            <span className="font-bold text-sm text-foreground/80">JS</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-[15px] leading-tight text-foreground">John Smith</span>
                            <span className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-tight uppercase tracking-wider">
                                Litigation Support
                            </span>
                        </div>
                    </div>

                    {/* Nav Menu */}
                    <nav className="flex flex-col gap-2 px-2">
                        <Link href="/dashboard" passHref legacyBehavior>
                            <Button
                                variant={isHome ? "outline" : "ghost"}
                                className={`justify-start font-medium rounded-full h-12 ${isHome ? "shadow-sm bg-background/80 text-foreground border border-border/60 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 px-5"}`}
                            >
                                {isHome ? (
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                        <Home className="w-4 h-4 text-background" fill="currentColor" />
                                    </div>
                                ) : (
                                    <Home className="w-5 h-5 mr-4 shrink-0" />
                                )}
                                <span className="text-[15px]">Home</span>
                            </Button>
                        </Link>

                        <Link href="/dashboard/upload" passHref legacyBehavior>
                            <Button
                                variant={isUpload ? "outline" : "ghost"}
                                className={`justify-start font-medium rounded-full h-12 ${isUpload ? "shadow-sm bg-background/80 text-foreground border border-border/60 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 px-5"}`}
                            >
                                {isUpload ? (
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                        <Folder className="w-4 h-4 text-background" fill="currentColor" />
                                    </div>
                                ) : (
                                    <Folder className="w-5 h-5 mr-4 shrink-0" />
                                )}
                                <span className="text-[15px]">Upload</span>
                            </Button>
                        </Link>

                        <Link href="/dashboard/library" passHref legacyBehavior>
                            <Button
                                variant={isLibrary ? "outline" : "ghost"}
                                className={`justify-start font-medium rounded-full h-12 ${isLibrary ? "shadow-sm bg-background/80 text-foreground border border-border/60 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 px-5"}`}
                            >
                                {isLibrary ? (
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                        <Library className="w-4 h-4 text-background" fill="currentColor" />
                                    </div>
                                ) : (
                                    <Library className="w-5 h-5 mr-4 shrink-0" />
                                )}
                                <span className="text-[15px]">Library</span>
                            </Button>
                        </Link>

                        <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:text-foreground rounded-full h-12 hover:bg-muted/50 px-5">
                            <MapIcon className="w-5 h-5 mr-4 shrink-0" />
                            <span className="text-[15px]">Map</span>
                        </Button>

                        <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:text-foreground rounded-full h-12 hover:bg-muted/50 px-5">
                            <Landmark className="w-5 h-5 mr-4 shrink-0" />
                            <span className="text-[15px]">Court</span>
                        </Button>
                    </nav>
                </div>
            </aside>

            {/* Right Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA] dark:bg-background/95">

                {/* Top Navigation Search & User */}
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/50 bg-background/80 backdrop-blur-md px-8 justify-end shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="relative hidden md:block w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Quick search..." className="pl-9 h-9 bg-background shadow-sm border-border/50 rounded-full text-sm" />
                        </div>
                        <div className="flex items-center gap-2 border-l border-border/50 pl-5">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 rounded-full relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary border-2 border-background"></span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 rounded-full ml-1">
                                <UserCircle className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Main Scrollable Area */}
                <main className="flex-1 overflow-y-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
