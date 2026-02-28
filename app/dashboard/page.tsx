"use client";

import * as React from "react";
import Link from "next/link";
import {
    Folder,
    Search,
    MoreHorizontal,
    ChevronDown,
    ChevronRight,
    PlusCircle,
    Plus,
    Home,
    Scale,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Citation, AuthorityPack } from "@/types/citation";

// Default binder authorities (matching original screenshot)
const DEFAULT_BINDER: Citation[] = [
    { id: "default-1", raw: "Acme Corp v. Jones, 2018 ONSC 1123", caseName: "Acme Corp v. Jones", reporter: "2018 ONSC 1123", year: "2018", type: "case", status: "resolved" },
    { id: "default-2", raw: "Goldberg v. Kelly, 397 U.S. 254 (1970)", caseName: "Goldberg v. Kelly", reporter: "397 U.S. 254", year: "1970", type: "case", status: "resolved" },
    { id: "default-3", raw: "Goldberg vr. Kelly, 397 U.S. 254 (1970)", caseName: "Goldberg vr. Kelly", reporter: "397 U.S. 254", year: "1970", type: "case", status: "ambiguous", passage: "DUE PROCESS" },
    { id: "default-4", raw: "Sample Energy v. Green Falls Co., 2022 ONCA 201", caseName: "Sample Energy v. Green Falls Co.", reporter: "2022 ONCA 201", year: "2022", type: "case", status: "resolved" },
];

type Step = "idle" | "searching" | "results";

export default function DashboardPage() {
    const [query, setQuery] = React.useState("");
    const [step, setStep] = React.useState<Step>("idle");
    const [answer, setAnswer] = React.useState("");
    const [citations, setCitations] = React.useState<Citation[]>([]);
    const [binder, setBinder] = React.useState<Citation[]>(DEFAULT_BINDER);
    const [matterName] = React.useState("Jones v. Smith");
    const [showSummary, setShowSummary] = React.useState(false);

    async function handleSearch(e?: React.FormEvent) {
        e?.preventDefault();
        if (!query.trim()) return;
        setStep("searching");
        setAnswer("");
        setCitations([]);

        try {
            const res = await fetch("/api/citations/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: query }),
            });
            const data = await res.json();
            setAnswer(data.answer ?? "");
            setCitations(data.citations ?? []);
            setStep("results");
        } catch {
            setStep("idle");
        }
    }

    function addToBinder(citation: Citation) {
        if (!binder.find((c) => c.id === citation.id)) {
            setBinder((prev) => [...prev, citation]);
        }
    }

    function removeFromBinder(id: string) {
        setBinder((prev) => prev.filter((c) => c.id !== id));
    }

    async function handleExport() {
        if (binder.length === 0) return;
        const res = await fetch("/api/citations/pack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ citations: binder, matterName }),
        });
        const { pack }: { pack: AuthorityPack } = await res.json();
        const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `authority-pack-${matterName.replace(/\s+/g, "-").toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

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
                            <span className="text-[15px]">Home</span>
                        </Button>
                        <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:text-foreground rounded-full h-12 hover:bg-muted/50 px-5">
                            <Folder className="w-5 h-5 mr-4 shrink-0" />
                            <span className="text-[15px]">Upload</span>
                        </Button>
                        <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:text-foreground rounded-full h-12 hover:bg-muted/50 px-5">
                            <MapIcon className="w-5 h-5 mr-4 shrink-0" />
                            <span className="text-[15px]">Map</span>
                        </Button>
                        <Link href="/admin" className="contents">
                            <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:text-foreground rounded-full h-12 hover:bg-muted/50 px-5">
                                <Landmark className="w-5 h-5 mr-4 shrink-0" />
                                <span className="text-[15px]">Court</span>
                            </Button>
                        </Link>
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

                            <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-background">
                                <CardHeader className="pb-5 pt-6 px-6">
                                    <CardTitle className="text-xl font-semibold">Extract Citations</CardTitle>
                                    <CardDescription className="pt-1.5 text-sm">
                                        Upload a draft to extract, resolve, and verify cited authorities.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5 px-6 pb-6 pt-2">
                                    <form onSubmit={handleSearch} className="relative">
                                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground z-10" />
                                        <Input
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Search database for citations matching current case..."
                                            className="pl-12 bg-background shadow-sm border-border/50 h-12 text-base rounded-xl relative z-10"
                                        />
                                    </form>
                                    <div className="flex items-center text-xs font-medium text-muted-foreground pt-1 px-1">
                                        {step === "searching" ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-primary" />
                                                Searching knowledge base
                                                <span className="ml-1 tracking-widest animate-pulse">...</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse mr-2"></div>
                                                Analyzing citations
                                                <span className="ml-1 tracking-widest animate-pulse">...</span>
                                            </>
                                        )}
                                    </div>
                                </CardContent>

                                {/* Answer text (shown after search) */}
                                {step === "results" && answer && (
                                    <div className="border-t border-border/40 px-6 py-5 bg-muted/5">
                                        <div className="prose prose-sm max-w-none text-[14px] leading-relaxed text-foreground/90 whitespace-pre-line">
                                            {answer}
                                        </div>
                                    </div>
                                )}

                                {/* Search results */}
                                {step === "results" && citations.length > 0 && (
                                    <div className="border-t border-border/40 divide-y divide-border/40 bg-muted/5">
                                        {/* Status summary strip */}
                                        <div className="px-6 py-3 flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                {citations.filter((c) => c.status === "resolved").length} Resolved
                                            </span>
                                            {citations.filter((c) => c.status === "ambiguous").length > 0 && (
                                                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    {citations.filter((c) => c.status === "ambiguous").length} Ambiguous
                                                </span>
                                            )}
                                        </div>

                                        {citations.map((citation) => {
                                            const inBinder = binder.some((c) => c.id === citation.id);
                                            return (
                                                <div key={citation.id} className="p-6 hover:bg-muted/30 transition-all duration-200 group relative">
                                                    <Button variant="ghost" size="icon" className="absolute right-6 top-6 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm hover:shadow">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    <div className="flex gap-4">
                                                        <div className="mt-1 w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0 border border-border/80">
                                                            <Folder className="w-4.5 h-4.5 text-foreground/80" fill="currentColor" />
                                                        </div>
                                                        <div className="pr-10 flex-1 min-w-0">
                                                            <h4 className="font-semibold text-[15px] group-hover:text-primary transition-colors">
                                                                {citation.caseName}
                                                                <span className="font-normal text-muted-foreground ml-1.5 text-[13px]">
                                                                    {citation.reporter}
                                                                    {citation.pinCite && `, ${citation.pinCite}`}
                                                                    {citation.year && ` (${citation.year})`}
                                                                </span>
                                                            </h4>
                                                            {citation.passage && (
                                                                <p className="text-[13.5px] text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed max-w-2xl">
                                                                    {citation.passage}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-3 mt-2">
                                                                {!inBinder ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 text-xs text-primary hover:text-primary px-0"
                                                                        onClick={() => addToBinder(citation)}
                                                                    >
                                                                        <Plus className="w-3 h-3 mr-1" />
                                                                        Add to Binder
                                                                    </Button>
                                                                ) : (
                                                                    <span className="inline-flex items-center text-xs text-primary font-medium gap-1">
                                                                        <CheckCircle2 className="w-3 h-3" /> In Binder
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                        </section>

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

                            <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-background flex flex-col">
                                {/* Header */}
                                <div className="p-5 border-b border-border/40 bg-muted/10 flex items-center justify-between group cursor-pointer hover:bg-muted/20 transition-colors">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Binder</span>
                                        <span className="font-medium text-foreground text-[15px]">{matterName}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-background border border-border/50 shadow-sm flex items-center justify-center group-hover:border-primary/30 transition-colors">
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>

                                {/* Summary (toggleable) */}
                                {showSummary && binder.length > 0 && (
                                    <div className="px-5 py-3 bg-muted/5 border-b border-border/40 flex gap-4 text-xs font-medium">
                                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> {binder.filter((c) => c.status === "resolved").length} verified
                                        </span>
                                        <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {binder.filter((c) => c.status === "ambiguous").length} review
                                        </span>
                                    </div>
                                )}

                                {/* Authorities List */}
                                <div className="p-0 border-b border-border/40 flex-1">
                                    <h3 className="font-semibold text-sm px-5 pt-5 mb-3">Key Authorities</h3>
                                    <div className="space-y-1 pb-3">
                                        {binder.map((c) => {
                                            const isAmbiguous = c.status === "ambiguous";
                                            return (
                                                <div
                                                    key={c.id}
                                                    className={`flex gap-3 items-start px-5 py-2.5 transition-colors cursor-pointer group ${isAmbiguous
                                                        ? "bg-yellow-500/10 border-l-[3px] border-yellow-500"
                                                        : "hover:bg-muted/30"
                                                        }`}
                                                >
                                                    {isAmbiguous ? (
                                                        <PlusCircle className="w-4.5 h-4.5 mt-0.5 text-yellow-600 dark:text-yellow-500 shrink-0 relative" fill="currentColor" />
                                                    ) : (
                                                        <Folder className="w-4 h-4 mt-0.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0" fill="currentColor" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-sm font-medium truncate ${isAmbiguous ? "text-foreground font-semibold" : "text-foreground/90 group-hover:text-foreground"}`}>
                                                            {c.caseName}, <span className={`font-normal ${isAmbiguous ? "text-muted-foreground text-[13px]" : "text-muted-foreground text-xs"}`}>
                                                                {c.reporter} ({c.year})
                                                            </span>
                                                        </p>
                                                        {isAmbiguous && c.passage && (
                                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                                <Badge variant="outline" className="h-5 text-[10px] font-semibold border-yellow-500/30 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 rounded-sm">
                                                                    {c.passage}
                                                                </Badge>
                                                                <p className="text-[11px] text-foreground font-medium">Standard highlighted</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive text-xs shrink-0"
                                                        onClick={() => removeFromBinder(c.id)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                                {/* Actions */}
                                <div className="p-5 space-y-3 bg-muted/10 rounded-b-2xl">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between h-11 bg-background rounded-xl border-border/60 hover:bg-muted/50 font-medium"
                                        onClick={() => setShowSummary((v) => !v)}
                                    >
                                        Generate Summary
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                        className="w-full justify-between h-11 bg-primary hover:bg-primary/90 rounded-xl font-medium"
                                        onClick={handleExport}
                                    >
                                        Export Binder
                                        <ChevronRight className="w-4 h-4 opacity-80" />
                                    </Button>
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
