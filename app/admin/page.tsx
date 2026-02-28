"use client";

import * as React from "react";
import Link from "next/link";
import {
    Scale,
    Home,
    Landmark,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronRight,
    Download,
    Link as LinkIcon,
    ArrowLeft,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CourtDatabase {
    databaseId: string;
    jurisdiction: string;
    jurisdictionLabel: string;
    name: string;
}

interface JurisdictionGroup {
    jurisdiction: string;
    label: string;
    courts: CourtDatabase[];
}

interface CaseItem {
    databaseId: string;
    caseId: string;
    title: string;
    citation: string;
    decisionDate?: string;
    keywords?: string[];
    url?: string;
}

interface ImportEvent {
    type: string;
    databaseId?: string;
    caseId?: string;
    title?: string;
    citation?: string;
    index?: number;
    total?: number;
    totalImported?: number;
    totalFailed?: number;
    message?: string;
}

type ImportStatus = "idle" | "running" | "done" | "error";

export default function AdminPage() {
    const [groups, setGroups] = React.useState<JurisdictionGroup[]>([]);
    const [expandedJurisdictions, setExpandedJurisdictions] = React.useState<Set<string>>(new Set(["ca", "on"]));
    const [selectedDbs, setSelectedDbs] = React.useState<Set<string>>(new Set());
    const [importStatus, setImportStatus] = React.useState<ImportStatus>("idle");
    const [log, setLog] = React.useState<ImportEvent[]>([]);
    const [progress, setProgress] = React.useState<{ imported: number; total: number }>({ imported: 0, total: 0 });
    const [urlInput, setUrlInput] = React.useState("");
    const [urlImporting, setUrlImporting] = React.useState(false);
    const [urlResult, setUrlResult] = React.useState<{ success: boolean; title?: string; citation?: string; error?: string } | null>(null);
    const logRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        fetch("/api/admin/courts")
            .then((r) => r.json())
            .then((d) => setGroups(d.groups ?? []));
    }, []);

    React.useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [log]);

    function toggleJurisdiction(jur: string) {
        setExpandedJurisdictions((prev) => {
            const next = new Set(prev);
            next.has(jur) ? next.delete(jur) : next.add(jur);
            return next;
        });
    }

    function toggleDb(dbId: string) {
        setSelectedDbs((prev) => {
            const next = new Set(prev);
            next.has(dbId) ? next.delete(dbId) : next.add(dbId);
            return next;
        });
    }

    function selectAll(courts: CourtDatabase[]) {
        setSelectedDbs((prev) => {
            const next = new Set(prev);
            courts.forEach((c) => next.add(c.databaseId));
            return next;
        });
    }

    async function startBulkImport() {
        if (selectedDbs.size === 0) return;
        setImportStatus("running");
        setLog([]);
        setProgress({ imported: 0, total: 0 });

        const ids = Array.from(selectedDbs).join(",");
        const res = await fetch(`/api/admin/cases/import-bulk?databaseIds=${encodeURIComponent(ids)}`);
        if (!res.body) {
            setImportStatus("error");
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                const dataLine = line.replace(/^data: /, "").trim();
                if (!dataLine) continue;
                try {
                    const event: ImportEvent = JSON.parse(dataLine);
                    setLog((prev) => [...prev.slice(-199), event]); // keep last 200
                    if (event.type === "case_imported") {
                        setProgress({ imported: event.totalImported ?? 0, total: event.total ?? 0 });
                    }
                    if (event.type === "complete") {
                        setImportStatus("done");
                    }
                } catch {
                    // skip malformed events
                }
            }
        }

        setImportStatus((s) => (s === "running" ? "done" : s));
    }

    async function importFromUrl() {
        if (!urlInput.trim()) return;
        setUrlImporting(true);
        setUrlResult(null);
        try {
            const res = await fetch("/api/admin/cases/import-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: urlInput.trim() }),
            });
            const data = await res.json();
            setUrlResult(data.success
                ? { success: true, title: data.title, citation: data.citation }
                : { success: false, error: data.error }
            );
            if (data.success) setUrlInput("");
        } catch (e) {
            setUrlResult({ success: false, error: String(e) });
        }
        setUrlImporting(false);
    }

    const totalSelected = selectedDbs.size;

    return (
        <div className="h-screen bg-background font-sans selection:bg-primary/20 flex overflow-hidden">

            {/* Sidebar */}
            <aside className="w-72 bg-muted/30 border-r border-border/50 flex flex-col shrink-0 overflow-y-auto">
                <div className="h-16 flex items-center px-8 border-b border-border/50 shrink-0 bg-background/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                            <Scale className="w-4.5 h-4.5" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Lex AI</span>
                    </div>
                </div>

                <div className="flex-1 p-6 flex flex-col gap-8">
                    <nav className="flex flex-col gap-2 px-2">
                        <Link href="/dashboard" className="contents">
                            <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:text-foreground rounded-full h-12 hover:bg-muted/50 px-5">
                                <Home className="w-5 h-5 mr-4 shrink-0" />
                                <span className="text-[15px]">Dashboard</span>
                            </Button>
                        </Link>
                        <Button variant="outline" className="justify-start shadow-sm bg-background/80 font-medium text-foreground rounded-full h-12 border border-border/60 hover:bg-background">
                            <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center mr-4 shrink-0">
                                <Landmark className="w-4 h-4 text-background" fill="currentColor" />
                            </div>
                            <span className="text-[15px]">Case Library</span>
                        </Button>
                    </nav>

                    {/* Selection summary */}
                    {totalSelected > 0 && (
                        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                            <p className="text-sm font-semibold text-primary">{totalSelected} court{totalSelected !== 1 ? "s" : ""} selected</p>
                            <p className="text-xs text-muted-foreground mt-1">Ready to bulk import into Backboard</p>
                            <Button
                                className="w-full mt-3 h-9 rounded-xl text-xs font-semibold"
                                onClick={startBulkImport}
                                disabled={importStatus === "running"}
                            >
                                {importStatus === "running" ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Importing...</>
                                ) : (
                                    <><Download className="w-3.5 h-3.5 mr-1.5" /> Import All Cases</>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA] dark:bg-background/95 overflow-y-auto">
                <header className="sticky top-0 z-30 h-16 flex items-center border-b border-border/50 bg-background/80 backdrop-blur-md px-8 gap-4 shrink-0">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="font-semibold text-base leading-tight">Case Library</h1>
                        <p className="text-xs text-muted-foreground">Import Canadian case law into Backboard</p>
                    </div>
                </header>

                <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8">

                    {/* Import from URL */}
                    <Card className="shadow-sm border-border/50 rounded-2xl bg-background">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-primary" />
                                Import Single Case by URL
                            </CardTitle>
                            <CardDescription className="text-sm">Paste any CanLII case URL to import it directly.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://canlii.org/en/ca/scc/doc/..."
                                    className="pl-10 h-10 bg-background border-border/50 rounded-xl text-sm"
                                    onKeyDown={(e) => e.key === "Enter" && importFromUrl()}
                                />
                            </div>
                            <Button
                                onClick={importFromUrl}
                                disabled={urlImporting || !urlInput.trim()}
                                className="h-10 px-5 rounded-xl font-semibold shrink-0"
                            >
                                {urlImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
                            </Button>
                        </CardContent>
                        {urlResult && (
                            <div className={`mx-6 mb-5 px-4 py-3 rounded-xl text-sm flex items-start gap-2 ${urlResult.success ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                                {urlResult.success
                                    ? <><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> <span><strong>{urlResult.title}</strong> — {urlResult.citation} added to Backboard</span></>
                                    : <><XCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{urlResult.error}</span></>
                                }
                            </div>
                        )}
                    </Card>

                    {/* Court browser */}
                    <Card className="shadow-sm border-border/50 rounded-2xl bg-background">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Landmark className="w-4 h-4 text-primary" />
                                Bulk Import by Court
                            </CardTitle>
                            <CardDescription className="text-sm">
                                Select courts below and click "Import All Cases" to populate Backboard with their full case law.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pb-6">
                            {groups.length === 0 && (
                                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading courts...
                                </div>
                            )}

                            {groups.map((group) => (
                                <div key={group.jurisdiction} className="rounded-xl border border-border/50 overflow-hidden">
                                    {/* Jurisdiction header */}
                                    <button
                                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors bg-muted/10"
                                        onClick={() => toggleJurisdiction(group.jurisdiction)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-sm">{group.label}</span>
                                            <Badge variant="secondary" className="text-[11px] h-5">
                                                {group.courts.length} courts
                                            </Badge>
                                            {group.courts.some((c) => selectedDbs.has(c.databaseId)) && (
                                                <Badge className="text-[11px] h-5 bg-primary/10 text-primary border-primary/20">
                                                    {group.courts.filter((c) => selectedDbs.has(c.databaseId)).length} selected
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="text-xs text-primary hover:underline font-medium px-2 py-0.5 rounded"
                                                onClick={(e) => { e.stopPropagation(); selectAll(group.courts); }}
                                            >
                                                Select all
                                            </button>
                                            {expandedJurisdictions.has(group.jurisdiction)
                                                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            }
                                        </div>
                                    </button>

                                    {/* Court list */}
                                    {expandedJurisdictions.has(group.jurisdiction) && (
                                        <div className="divide-y divide-border/30">
                                            {group.courts.map((court) => {
                                                const selected = selectedDbs.has(court.databaseId);
                                                return (
                                                    <label
                                                        key={court.databaseId}
                                                        className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/20"}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleDb(court.databaseId)}
                                                            className="w-4 h-4 rounded accent-primary shrink-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-foreground/90 truncate">{court.name}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{court.databaseId}</p>
                                                        </div>
                                                        {selected && (
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Import progress */}
                    {(importStatus === "running" || importStatus === "done" || log.length > 0) && (
                        <Card className="shadow-sm border-border/50 rounded-2xl bg-background">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        {importStatus === "running"
                                            ? <><Loader2 className="w-4 h-4 animate-spin text-primary" /> Importing cases...</>
                                            : importStatus === "done"
                                                ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Import complete</>
                                                : "Import log"
                                        }
                                    </CardTitle>
                                    {importStatus !== "idle" && (
                                        <span className="text-sm text-muted-foreground font-medium">
                                            {progress.imported} imported
                                            {progress.total > 0 && ` / ${progress.total}`}
                                        </span>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {importStatus === "running" && progress.total > 0 && (
                                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300 rounded-full"
                                            style={{ width: `${Math.min(100, (progress.imported / progress.total) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </CardHeader>

                            <Separator />

                            <div
                                ref={logRef}
                                className="max-h-64 overflow-y-auto p-4 space-y-1 font-mono text-xs"
                            >
                                {log.map((evt, i) => (
                                    <div key={i} className={`flex items-start gap-2 ${evt.type === "case_failed" ? "text-destructive" : evt.type === "complete" ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground"}`}>
                                        {evt.type === "case_imported" && <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />}
                                        {evt.type === "case_failed" && <XCircle className="w-3 h-3 mt-0.5 shrink-0" />}
                                        {evt.type === "database_start" && <span className="text-primary shrink-0">→</span>}
                                        {evt.type === "database_done" && <span className="text-primary shrink-0">✓</span>}
                                        {evt.type === "complete" && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
                                        <span>
                                            {evt.type === "case_imported" && `[${evt.databaseId}] ${evt.title} — ${evt.citation}`}
                                            {evt.type === "case_failed" && `[${evt.databaseId}] FAILED: ${evt.title}`}
                                            {evt.type === "database_start" && `Starting import: ${evt.databaseId}`}
                                            {evt.type === "database_done" && `Done: ${evt.databaseId}`}
                                            {evt.type === "database_total" && `Found ${(evt as ImportEvent & { total: number }).total} cases in ${evt.databaseId}`}
                                            {evt.type === "complete" && `Import complete — ${evt.totalImported} imported, ${evt.totalFailed} failed`}
                                            {evt.type === "error" && `Error: ${evt.message}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                </main>
            </div>
        </div>
    );
}
