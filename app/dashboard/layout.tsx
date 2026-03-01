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
    Library,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadProvider, useUploadContext } from "@/contexts/upload-context";
import { DocumentChatProvider } from "@/contexts/document-chat-context";
import { LibraryChatProvider } from "@/contexts/library-chat-context";

function UploadStatusPill() {
    const { phase, progress, filename, reset } = useUploadContext();

    if (phase === "idle") return null;

    const isActive = phase !== "complete" && phase !== "error" && phase !== "timeout";

    return (
        <div className={`mx-2 mt-2 rounded-2xl border px-4 py-3 text-xs flex flex-col gap-2 transition-colors ${
            phase === "complete"
                ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"
                : phase === "error"
                ? "border-destructive/30 bg-destructive/5"
                : phase === "timeout"
                ? "border-amber-200 bg-amber-50 dark:bg-amber-950/30"
                : "border-border/60 bg-background"
        }`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {phase === "complete" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : phase === "error" ? (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    ) : phase === "timeout" ? (
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                    ) : (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                    )}
                    <span className="font-medium truncate text-foreground/80">
                        {phase === "complete"
                            ? "Indexed"
                            : phase === "error"
                            ? "Failed"
                            : phase === "timeout"
                            ? "Still indexing…"
                            : phase === "processing"
                            ? "Indexing…"
                            : "Uploading…"}
                    </span>
                </div>
                {!isActive && (
                    <button
                        onClick={reset}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {filename && (
                <span className="text-muted-foreground truncate">{filename}</span>
            )}

            {isActive && (
                <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isHome = pathname === "/dashboard";
    const isUpload = pathname === "/dashboard/upload";
    const isLibrary = pathname === "/dashboard/library";
    const isMap = pathname === "/dashboard/map";

    return (
        <div className="h-screen bg-background font-sans selection:bg-primary/20 flex overflow-hidden">
            {/* Left Sidebar */}
            <aside className="w-72 bg-muted/30 border-r border-border/50 flex flex-col shrink-0 overflow-y-auto">
                {/* Logo Area */}
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
                        <Button
                            asChild
                            variant={isHome ? "outline" : "ghost"}
                            className={`justify-start font-medium rounded-full h-12 ${isHome ? "shadow-sm bg-background/80 text-foreground border border-border/60 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 px-5"}`}
                        >
                            <Link href="/dashboard">
                                {isHome ? (
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                        <Home className="w-4 h-4 text-background" fill="currentColor" />
                                    </div>
                                ) : (
                                    <Home className="w-5 h-5 mr-4 shrink-0" />
                                )}
                                <span className="text-[15px]">Home</span>
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant={isUpload ? "outline" : "ghost"}
                            className={`justify-start font-medium rounded-full h-12 ${isUpload ? "shadow-sm bg-background/80 text-foreground border border-border/60 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 px-5"}`}
                        >
                            <Link href="/dashboard/upload">
                                {isUpload ? (
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                        <Folder className="w-4 h-4 text-background" fill="currentColor" />
                                    </div>
                                ) : (
                                    <Folder className="w-5 h-5 mr-4 shrink-0" />
                                )}
                                <span className="text-[15px]">Upload</span>
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant={isLibrary ? "outline" : "ghost"}
                            className={`justify-start font-medium rounded-full h-12 ${isLibrary ? "shadow-sm bg-background/80 text-foreground border border-border/60 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 px-5"}`}
                        >
                            <Link href="/dashboard/library">
                                {isLibrary ? (
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                        <Library className="w-4 h-4 text-background" fill="currentColor" />
                                    </div>
                                ) : (
                                    <Library className="w-5 h-5 mr-4 shrink-0" />
                                )}
                                <span className="text-[15px]">Library</span>
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant={isMap ? "outline" : "ghost"}
                            className={`justify-start font-medium rounded-full h-12 ${isMap ? "shadow-sm bg-background/80 text-foreground border border-border/60 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 px-5"}`}
                        >
                            <Link href="/dashboard/map">
                                {isMap ? (
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                        <MapIcon className="w-4 h-4 text-background" fill="currentColor" />
                                    </div>
                                ) : (
                                    <MapIcon className="w-5 h-5 mr-4 shrink-0" />
                                )}
                                <span className="text-[15px]">Map</span>
                            </Link>
                        </Button>

                        <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:text-foreground rounded-full h-12 hover:bg-muted/50 px-5">
                            <Landmark className="w-5 h-5 mr-4 shrink-0" />
                            <span className="text-[15px]">Court</span>
                        </Button>
                    </nav>

                    {/* Upload status pill */}
                    <UploadStatusPill />
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

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UploadProvider>
            <DocumentChatProvider>
                <LibraryChatProvider>
                    <DashboardLayoutInner>{children}</DashboardLayoutInner>
                </LibraryChatProvider>
            </DocumentChatProvider>
        </UploadProvider>
    );
}
