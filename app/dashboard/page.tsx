"use client";

import * as React from "react";
import {
    Folder,
    Search,
    MoreHorizontal,
    ChevronDown,
    ChevronRight,
    PlusCircle,
    Plus,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from "lucide-react";
import Markdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Citation, AuthorityPack } from "@/types/citation";

// Default binder authorities (matching original screenshot)
const DEFAULT_BINDER: Citation[] = [
    { id: "default-1", raw: "Davis v. Monroe County Bd. of Educ., 526 U.S. 629 (1999)", caseName: "Davis v. Monroe County Bd. of Educ.", reporter: "526 U.S. 629", year: "1999", type: "case", status: "resolved" },
    { id: "default-2", raw: "Tinker v. Des Moines Indep. Cmty. Sch. Dist., 393 U.S. 503 (1969)", caseName: "Tinker v. Des Moines Indep. Cmty. Sch. Dist.", reporter: "393 U.S. 503", year: "1969", type: "case", status: "resolved" },
    { id: "default-3", raw: "Nabozny v. Podlesny, 92 F.3d 446 (1996)", caseName: "Nabozny v. Podlesny", reporter: "92 F.3d 446", year: "1996", type: "case", status: "ambiguous", passage: "FAILURE TO PROTECT" },
    { id: "default-4", raw: "Mahanoy Area Sch. Dist. v. B.L., 141 S. Ct. 2038 (2021)", caseName: "Mahanoy Area Sch. Dist. v. B.L.", reporter: "141 S. Ct. 2038", year: "2021", type: "case", status: "resolved" },
];

type Step = "idle" | "searching" | "results";

export default function DashboardPage() {
    const [query, setQuery] = React.useState("");
    const [step, setStep] = React.useState<Step>("idle");
    const [answer, setAnswer] = React.useState("");
    const [citations, setCitations] = React.useState<Citation[]>([]);
    const [error, setError] = React.useState("");
    const [binder, setBinder] = React.useState<Citation[]>(DEFAULT_BINDER);
    const [matterName] = React.useState("Smith v. Midville");
    const [showSummary, setShowSummary] = React.useState(false);
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    async function handleSearch(e?: React.FormEvent<HTMLFormElement>) {
        e?.preventDefault();
        if (!query.trim()) return;
        setStep("searching");
        setAnswer("");
        setCitations([]);
        setError("");

        try {
            const res = await fetch("/api/citations/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: query }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? `Request failed (${res.status})`);
                setStep("idle");
                return;
            }
            setAnswer(data.answer ?? "");
            // Deduplicate citations by caseName (keep first occurrence)
            const raw: Citation[] = data.citations ?? [];
            const seen = new Set<string>();
            const unique = raw.filter((c) => {
                const key = c.caseName.toLowerCase().trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            setCitations(unique);
            setStep("results");
        } catch (err) {
            setError("Network error — could not reach the server.");
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
                        {error && (
                            <div className="flex items-center text-xs font-medium text-destructive pt-1 px-1">
                                <AlertCircle className="w-3.5 h-3.5 mr-2 shrink-0" />
                                {error}
                            </div>
                        )}
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
                                const isExpanded = expandedId === citation.id;
                                return (
                                    <div
                                        key={citation.id}
                                        className="hover:bg-muted/30 transition-all duration-200 group relative cursor-pointer"
                                        onClick={() => setExpandedId(isExpanded ? null : citation.id)}
                                    >
                                        {/* ... menu on hover */}
                                        <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm hover:shadow z-10" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>

                                        <div className="flex gap-3.5 px-5 py-4">
                                            <div className="mt-0.5 w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                                                <Folder className="w-4 h-4 text-muted-foreground" fill="currentColor" />
                                            </div>
                                            <div className="pr-10 flex-1 min-w-0">
                                                {/* Header: Case Name, reporter (year) */}
                                                <h4 className="font-semibold text-[15px] leading-snug">
                                                    {citation.caseName},
                                                    <span className="font-normal text-muted-foreground ml-1 text-[13px]">
                                                        {citation.reporter}{citation.pinCite ? `, ${citation.pinCite}` : ""} ({citation.year})
                                                    </span>
                                                </h4>

                                                {/* Collapsed: passage preview (2 lines) */}
                                                {!isExpanded && citation.passage && (
                                                    <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                                                        {citation.passage}
                                                    </p>
                                                )}

                                                {/* Expanded: full details */}
                                                {isExpanded && (
                                                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        {/* Key passage */}
                                                        {citation.passage && (
                                                            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Key Passage</p>
                                                                <p className="text-[13px] text-foreground/80 leading-relaxed italic">
                                                                    &ldquo;{citation.passage}&rdquo;
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Full analysis from LLM */}
                                                        {answer && (
                                                            <div className="bg-background rounded-lg p-3 border border-border/30">
                                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Analysis</p>
                                                                <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-foreground/80">
                                                                    <Markdown>{answer}</Markdown>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Badges */}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="secondary" className="text-[11px] h-5 rounded-sm font-medium capitalize">
                                                                {citation.type}
                                                            </Badge>
                                                            {citation.status === "resolved" && (
                                                                <Badge variant="outline" className="text-[11px] h-5 rounded-sm font-medium text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5">
                                                                    Verified
                                                                </Badge>
                                                            )}
                                                            {citation.status === "ambiguous" && (
                                                                <Badge variant="outline" className="text-[11px] h-5 rounded-sm font-medium text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/5">
                                                                    Needs Review
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Source + Add to Binder */}
                                                        <div className="flex items-center justify-between pt-1">
                                                            {citation.source && (
                                                                <span className="text-[11px] text-muted-foreground truncate mr-3">
                                                                    {citation.source}
                                                                </span>
                                                            )}
                                                            {!inBinder ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 text-xs shrink-0"
                                                                    onClick={(e) => { e.stopPropagation(); addToBinder(citation); }}
                                                                >
                                                                    <Plus className="w-3 h-3 mr-1" />
                                                                    Add to Binder
                                                                </Button>
                                                            ) : (
                                                                <span className="inline-flex items-center text-xs text-primary font-medium gap-1 shrink-0">
                                                                    <CheckCircle2 className="w-3 h-3" /> In Binder
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </section>

            {/* Right Column (Binder) */}
            <aside className="xl:col-span-4 flex flex-col gap-6 sticky top-6">
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
                </Card>
            </aside>
        </div>
    );
}
