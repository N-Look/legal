"use client";

import * as React from "react";
import { Folder, UploadCloud, ChevronDown, MoreHorizontal, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
    const [isUploaded, setIsUploaded] = React.useState(false);

    const handleUploadClick = () => {
        setIsUploaded(true);
    };

    if (!isUploaded) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="w-full max-w-3xl flex flex-col items-center">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground/90 mb-4">Upload Document</h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                            Select a legal draft to extract authorities, generate summaries, and prepare for filing.
                        </p>
                    </div>

                    <Card className="w-full shadow-sm border-border/80 rounded-[2rem] bg-background/50 overflow-hidden">
                        <div className="p-2">
                            <div
                                onClick={handleUploadClick}
                                className="border-2 border-dashed border-border/80 rounded-[1.75rem] p-16 flex flex-col items-center justify-center text-center bg-muted/5 hover:bg-muted/30 hover:border-primary/50 transition-all duration-300 cursor-pointer group min-h-[400px]"
                            >
                                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                                    <UploadCloud className="w-12 h-12 text-primary" strokeWidth={2} />
                                </div>
                                <h3 className="text-2xl font-semibold mb-3 text-foreground/90">Drag & drop your document here</h3>
                                <p className="text-muted-foreground mb-10 text-lg">Support for PDF, Word, and Text files up to 50MB.</p>
                                <Button size="lg" className="rounded-xl font-semibold shadow-sm h-14 px-10 text-lg bg-primary hover:bg-primary/90 pointer-events-none">
                                    Browse Files
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl flex flex-col gap-8 pb-10">
            {/* Header Area */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Document Extraction</h1>
                <p className="text-muted-foreground">Reviewing extracted authorities and generated summary.</p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left Column (Document Preview Layout) */}
                <aside className="xl:col-span-5 flex flex-col gap-6">
                    <Card className="shadow-sm border-border/50 rounded-2xl bg-background overflow-hidden flex flex-col min-h-[600px] sticky top-6">
                        <div className="p-4 flex items-center justify-between border-b border-border/40 bg-muted/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-primary" fill="currentColor" />
                                </div>
                                <span className="font-semibold text-[15px]">Uploaded_Draft_v2.pdf</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 p-8 flex flex-col items-center py-12 bg-muted/5 relative overflow-hidden">
                            {/* PDF Preview Skeleton */}
                            <div className="w-full max-w-sm aspect-[1/1.4] bg-background border border-border/60 shadow-md rounded-xl p-8 flex flex-col gap-6 opacity-70 relative z-10">
                                <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mx-auto mb-4"></div>
                                <div className="space-y-4">
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-full"></div>
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-[90%]"></div>
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-[95%]"></div>
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-[80%]"></div>
                                </div>
                                <div className="space-y-4 mt-6">
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-[85%]"></div>
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-full"></div>
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-[70%]"></div>
                                </div>
                                <div className="space-y-4 mt-6">
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-[95%]"></div>
                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-[80%]"></div>
                                </div>
                            </div>

                            {/* Indicator for scrolling */}
                            <div className="absolute top-0 bottom-0 right-4 w-1.5 bg-border/40 rounded-full my-12">
                                <div className="w-full h-24 bg-primary/20 rounded-full shadow-sm"></div>
                            </div>
                        </div>

                        <div className="p-3 border-t border-border/40 bg-muted/10 flex justify-center hover:bg-muted/30 cursor-pointer transition-colors mt-auto group">
                            <ChevronDown className="w-5 h-5 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                        </div>
                    </Card>
                </aside>

                {/* Right Column (Summary & Notes) */}
                <section className="xl:col-span-7 flex flex-col gap-6">
                    {/* Extracted Summary Card */}
                    <Card className="shadow-sm border-border/50 rounded-2xl bg-background">
                        <CardHeader className="pb-5 pt-6 px-7 border-b border-border/30">
                            <CardTitle className="text-xl font-semibold text-foreground/80 tracking-tight">Extracted Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-7">
                            <div className="flex flex-col gap-5 opacity-60">
                                <div className="flex gap-4 items-center">
                                    <div className="h-2.5 bg-foreground rounded-full w-full max-w-[200px]"></div>
                                    <div className="h-2.5 bg-foreground rounded-full w-24"></div>
                                    <div className="h-2.5 bg-foreground rounded-full w-full max-w-[150px]"></div>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="h-2.5 bg-foreground rounded-full w-48"></div>
                                    <div className="h-2.5 bg-foreground rounded-full w-full max-w-[280px]"></div>
                                    <div className="h-2.5 bg-foreground rounded-full w-32"></div>
                                </div>
                                <div className="h-2.5 bg-foreground rounded-full w-full max-w-[400px]"></div>
                                <div className="flex gap-4 items-center pt-2">
                                    <div className="h-2.5 bg-foreground rounded-full w-16"></div>
                                    <div className="h-2.5 bg-foreground rounded-full w-full max-w-[300px]"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Document Notes Card */}
                    <Card className="shadow-sm border-border/50 rounded-2xl bg-background">
                        <CardHeader className="pb-5 pt-6 px-7 border-b border-border/30 focus:outline-none focus-visible:ring">
                            <CardTitle className="text-xl font-semibold text-foreground/80 tracking-tight">Document Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="p-7">
                            <div className="flex flex-col gap-6 opacity-60">
                                <div className="flex flex-col gap-5">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2.5 bg-foreground rounded-full w-24"></div>
                                        <div className="h-2.5 bg-foreground rounded-full w-full max-w-[220px]"></div>
                                    </div>
                                    <div className="h-2.5 bg-foreground rounded-full w-[80%]"></div>
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2.5 bg-foreground rounded-full w-full max-w-[340px]"></div>
                                    </div>
                                    <div className="h-2.5 bg-foreground rounded-full w-[60%]"></div>
                                </div>
                                <div className="flex flex-col gap-5 pt-5 border-t border-border/30">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2.5 bg-foreground rounded-full w-40"></div>
                                        <div className="h-2.5 bg-foreground rounded-full w-28"></div>
                                    </div>
                                    <div className="h-2.5 bg-foreground rounded-full w-full max-w-[400px]"></div>
                                </div>
                                <div className="flex flex-col gap-5 pt-5 border-t border-border/30">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2.5 bg-foreground rounded-full w-32"></div>
                                        <div className="h-2.5 bg-foreground rounded-full w-full max-w-[240px]"></div>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2.5 bg-foreground rounded-full w-full max-w-[300px]"></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}
