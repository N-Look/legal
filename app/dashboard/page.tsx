"use client";

import * as React from "react";
import {
    Folder,
    Search,
    MoreHorizontal,
    ChevronDown,
    PlusCircle,
    ChevronRight,
    Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
    return (
        <div className="mx-auto max-w-6xl grid grid-cols-1 xl:grid-cols-10 gap-8 items-start">

            {/* Middle Column (Extract Citations Search & Results) */}
            <section className="xl:col-span-6 flex flex-col gap-6">

                <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-background">
                    <CardHeader className="pb-5 pt-6 px-6">
                        <CardTitle className="text-xl font-semibold">Extract Citations</CardTitle>
                        <CardDescription className="pt-1.5 text-sm">
                            Upload a draft to extract, resolve, and verify cited authorities.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 px-6 pb-6 pt-2">
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground z-10" />
                            <Input
                                type="text"
                                placeholder="Search database for citations matching current case..."
                                className="pl-12 bg-background shadow-sm border-border/50 h-12 text-base rounded-xl relative z-10"
                            />
                        </div>
                        <div className="flex items-center text-xs font-medium text-muted-foreground pt-1 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse mr-2"></div>
                            Analyzing citations
                            <span className="ml-1 tracking-widest animate-pulse">...</span>
                        </div>
                    </CardContent>
                    <div className="border-t border-border/40 divide-y divide-border/40 bg-muted/5">
                        {/* Result Item 1 */}
                        <div className="p-6 hover:bg-muted/30 transition-all duration-200 group relative">
                            <Button variant="ghost" size="icon" className="absolute right-6 top-6 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm hover:shadow">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            <div className="flex gap-4">
                                <div className="mt-1 w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0 border border-border/80">
                                    <Folder className="w-4.5 h-4.5 text-foreground/80" fill="currentColor" />
                                </div>
                                <div className="pr-10">
                                    <h4 className="font-semibold text-[15px] group-hover:text-primary transition-colors">
                                        Goldberg vr. Kelly, <span className="font-normal text-muted-foreground ml-1">397 U.S. 254, 267 (1970)</span>
                                    </h4>
                                    <p className="text-[13.5px] text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed max-w-2xl">
                                        The court held that due process requires some form of hearing before an individual is stripped of benefits. The extent of the hearing required depends on the importance of the interests involved and the nature of the subsequent proceedings.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Result Item 2 */}
                        <div className="p-6 hover:bg-muted/30 transition-all duration-200 group relative">
                            <Button variant="ghost" size="icon" className="absolute right-6 top-6 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm hover:shadow">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            <div className="flex gap-4">
                                <div className="mt-1 w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0 border border-border/80">
                                    <Folder className="w-4.5 h-4.5 text-foreground/80" fill="currentColor" />
                                </div>
                                <div className="pr-10">
                                    <h4 className="font-semibold text-[15px] group-hover:text-primary transition-colors">
                                        Sample Energy v. Green Falls Co., <span className="font-normal text-muted-foreground ml-1">2022 ONCA 201</span>
                                    </h4>
                                    <div className="flex items-center gap-2 mt-2 mb-2.5">
                                        <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border/50">
                                            Ontario Court of Appeal
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium">•</span>
                                        <span className="text-xs text-muted-foreground">2022</span>
                                    </div>
                                    <p className="text-[13.5px] text-foreground font-medium flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"></span>
                                        Rescission of contract terms
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

            </section>

            {/* Right Column (Binders, Authorities, Actions) */}
            <aside className="xl:col-span-4 flex flex-col gap-6">

                {/* Search Binders */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input placeholder="Search binders..." className="pl-10 h-10 bg-background shadow-sm border-border/50 rounded-xl focus-visible:ring-primary/50" />
                    </div>
                    <Button variant="default" size="sm" className="h-10 rounded-xl px-4 font-semibold shrink-0">
                        <Plus className="w-4 h-4 mr-1.5" strokeWidth={3} />
                        New Binder
                    </Button>
                </div>

                <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-background flex flex-col">
                    {/* Header */}
                    <div className="p-5 border-b border-border/40 bg-muted/10 flex items-center justify-between group cursor-pointer hover:bg-muted/20 transition-colors">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Binder</span>
                            <span className="font-medium text-foreground text-[15px]">Jones v. Smith</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-background border border-border/50 shadow-sm flex items-center justify-center group-hover:border-primary/30 transition-colors">
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Authorities List */}
                    <div className="p-0 border-b border-border/40 flex-1">
                        <h3 className="font-semibold text-sm px-5 pt-5 mb-3">Key Authorities</h3>
                        <div className="space-y-1 pb-3">
                            <div className="flex gap-3 items-start px-5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer group">
                                <Folder className="w-4 h-4 mt-0.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0" fill="currentColor" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground">Acme Corp v. Jones, <span className="font-normal text-muted-foreground text-xs">2018 ONSC 1123</span></p>
                                </div>
                            </div>

                            <div className="flex gap-3 items-start px-5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer group">
                                <Folder className="w-4 h-4 mt-0.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0" fill="currentColor" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground">Goldberg v. Kelly, <span className="font-normal text-muted-foreground text-xs">397 U.S. 254 (1970)</span></p>
                                </div>
                            </div>

                            {/* Highlighted Warning Item */}
                            <div className="flex gap-3 items-start px-5 py-3 bg-yellow-500/10 border-l-[3px] border-yellow-500 cursor-pointer relative overflow-hidden">
                                <PlusCircle className="w-4.5 h-4.5 mt-0.5 text-yellow-600 dark:text-yellow-500 shrink-0 relative" fill="currentColor" />
                                <div className="min-w-0 relative">
                                    <p className="text-sm font-semibold truncate text-foreground">Goldberg vr. Kelly, <span className="font-normal text-muted-foreground text-[13px]">397 U.S. 254 (1970)</span></p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Badge variant="outline" className="h-5 text-[10px] font-semibold border-yellow-500/30 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 rounded-sm">
                                            DUE PROCESS
                                        </Badge>
                                        <p className="text-[11px] text-foreground font-medium">Standard highlighted</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 items-start px-5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer group">
                                <Folder className="w-4 h-4 mt-0.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0" fill="currentColor" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground">Sample Energy v. Green Falls Co., <span className="font-normal text-muted-foreground text-xs">2022 ONCA 201</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-5 space-y-3 bg-muted/10 rounded-b-2xl">
                        <Button variant="outline" className="w-full justify-between h-11 bg-background rounded-xl border-border/60 hover:bg-muted/50 font-medium">
                            Generate Summary
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button className="w-full justify-between h-11 bg-primary hover:bg-primary/90 rounded-xl font-medium">
                            Export Binder
                            <ChevronRight className="w-4 h-4 opacity-80" />
                        </Button>
                    </div>
                </Card>

            </aside>
        </div>
    );
}
