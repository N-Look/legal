"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowRight,
    CheckCircle2,
    FileText,
    Download,
    Shield,
    Search,
    BookOpen,
    Link as LinkIcon,
    Users,
    CheckSquare,
    History,
    AlertCircle,
    Menu,
    X,
    Scale,
    MessageSquare,
    Upload,
    Brain,
    Map,
    Landmark,
    Sparkles,
    Eye,
    FolderOpen
} from "lucide-react";

export default function LandingPage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const { scrollY } = useScroll();
    const shouldReduceMotion = useReducedMotion();

    // Scroll animations for hero section
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);
    const previewY = useTransform(scrollY, [0, 400], [0, 50]);
    const previewOpacity = useTransform(scrollY, [0, 400], [1, 0.5]);
    const previewBlur = useTransform(scrollY, [0, 400], ["blur(0px)", "blur(8px)"]);

    const fadeUpVariant = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
    };

    const itemVariant = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
    };

    const steps = [
        { title: "Upload Documents", desc: "Drag and drop briefs, transcripts, and exhibits. AI indexes everything automatically.", icon: Upload },
        { title: "Ask Questions", desc: "Chat with your documents using AI. Get answers with direct PDF references.", icon: MessageSquare },
        { title: "Map Your Case", desc: "Visualize arguments, evidence, and contradictions in an interactive graph.", icon: Map },
        { title: "Search & Export", desc: "Find citations from CanLII, build curated authority binders, and export.", icon: Download }
    ];

    const features = [
        { title: "AI Document Chat", desc: "Ask questions about any uploaded document and get AI answers grounded in the actual text, with clickable quote references.", icon: MessageSquare },
        { title: "Citation Search", desc: "Search the CanLII database with natural language. AI analyzes results and extracts key passages for your case.", icon: Search },
        { title: "Argument Mapping", desc: "Visualize your case as an interactive graph. See how claims, evidence, and counterarguments connect.", icon: Map },
        { title: "Smart PDF Viewer", desc: "View documents with text-layer highlighting. Click a quoted passage and jump straight to it in the PDF.", icon: Eye },
        { title: "Client/Matter Scoping", desc: "Organize documents by client and matter. Data stays strictly separated across engagements.", icon: Users },
        { title: "AI-Powered Indexing", desc: "Every uploaded document is automatically processed and indexed, making it instantly searchable and chat-ready.", icon: Brain },
        { title: "Authority Binder Export", desc: "Build curated binders of key authorities and export structured, audit-ready JSON packs.", icon: FolderOpen },
        { title: "Full Audit Trail", desc: "Complete provenance tracking. Know exactly when documents were uploaded, processed, and referenced.", icon: History }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/20">

            {/* Top Nav */}
            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50"
            >
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            <Scale className="w-4.5 h-4.5" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Lex AI</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
                        <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
                        <a href="#security" className="text-muted-foreground hover:text-foreground transition-colors">Security</a>
                        <Link href="/dashboard">
                            <Button size="sm" className="rounded-full">Go to App</Button>
                        </Link>
                    </div>

                    {/* Mobile Nav Toggle */}
                    <button
                        className="md:hidden p-2 text-muted-foreground"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile Nav Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t py-4 px-6 bg-background flex flex-col gap-4">
                        <a href="#how-it-works" className="text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>How it works</a>
                        <a href="#features" className="text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
                        <a href="#security" className="text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>Security</a>
                        <Link href="/dashboard" className="w-full mt-2 block" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full">Go to App</Button>
                        </Link>
                    </div>
                )}
            </motion.nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
                <motion.div
                    style={!shouldReduceMotion ? { y: useTransform(scrollY, [0, 500], [0, 150]) } : undefined}
                    className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"
                ></motion.div>
                <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">

                    <motion.div
                        style={!shouldReduceMotion ? { opacity: heroOpacity, scale: heroScale } : undefined}
                        className="flex flex-col gap-6"
                    >
                        <Badge variant="outline" className="w-fit rounded-full px-4 py-1.5 border-primary/20 bg-primary/5 text-primary">
                            <Sparkles className="w-3.5 h-3.5 mr-2 inline" />
                            AI-Powered Legal Research
                        </Badge>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
                        >
                            Your Intelligent <br className="hidden md:block" /> Case Companion.
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                            className="text-xl text-muted-foreground max-w-lg leading-relaxed"
                        >
                            Upload documents, chat with AI about your case, map arguments visually, and search citations — all in one platform built for legal professionals.
                        </motion.p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <Link href="/dashboard" className="contents">
                                <Button size="lg" className="rounded-full h-12 px-8 text-base">
                                    Go to App
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                            <a href="#how-it-works" className="contents">
                                <Button size="lg" variant="outline" className="rounded-full h-12 px-8 text-base">
                                    See How It Works
                                </Button>
                            </a>
                        </div>

                        {/* Trust Strip */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 pt-8 border-t border-border/50 text-sm font-medium text-muted-foreground">
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> AI Document Chat</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Argument Mapping</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Citation Search</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Document Intelligence</span>
                        </div>
                    </motion.div>

                    <motion.div
                        style={!shouldReduceMotion ? { y: previewY, opacity: previewOpacity, filter: previewBlur } : undefined}
                        className="relative"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary/30 to-muted/30 rounded-[2rem] blur-xl opacity-50"></div>
                        <motion.div
                            initial={{ opacity: 0, rotateX: 10, rotateY: -10, scale: 0.9 }}
                            animate={{ opacity: 1, rotateX: 0, rotateY: 0, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            >
                                <Card className="relative bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl overflow-hidden">
                                    <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/20">
                                        <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-warning/80 bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                        <span className="ml-3 text-xs text-muted-foreground font-mono">Lex AI — Document Intelligence</span>
                                    </div>
                                    <CardContent className="p-6">
                                        {/* AI Chat Preview */}
                                        <div className="mb-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <MessageSquare className="w-4 h-4 text-primary" />
                                                <h3 className="font-semibold text-sm">AI Chat — Smith_Deposition.pdf</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold">JS</div>
                                                    <div className="bg-muted/50 rounded-lg rounded-tl-none px-3 py-2 text-sm">
                                                        What were the key admissions in Smith&apos;s deposition?
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Brain className="w-3.5 h-3.5 text-primary" />
                                                    </div>
                                                    <div className="bg-primary/5 border border-primary/10 rounded-lg rounded-tl-none px-3 py-2 text-sm">
                                                        <p className="text-foreground/80 leading-relaxed">Smith admitted knowledge of the safety violation on <span className="bg-yellow-500/20 px-1 rounded cursor-pointer hover:bg-yellow-500/30 transition-colors">page 14, lines 8-12</span>, stating they were &ldquo;aware of the issue but chose not to escalate.&rdquo;</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator className="my-4" />

                                        {/* Bottom: mini feature pills */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                                                <Search className="w-3 h-3" /> Citation Search
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                                                <Map className="w-3 h-3" /> Argument Map
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                                                <FolderOpen className="w-3 h-3" /> Binder Export
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Problem vs Solution */}
            <section className="py-24 bg-muted/30 px-6">
                <div className="container mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeUpVariant}
                        className="grid md:grid-cols-2 gap-16"
                    >
                        <div>
                            <h2 className="text-3xl font-bold mb-6">The old way is costly.</h2>
                            <motion.ul variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4 text-muted-foreground">
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0"></span>
                                    <p>Case files scattered across drives, emails, and databases with no unified view.</p>
                                </motion.li>
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0"></span>
                                    <p>Hours spent manually reviewing transcripts and briefs for key facts.</p>
                                </motion.li>
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0"></span>
                                    <p>No way to see how arguments, evidence, and counterarguments relate at a glance.</p>
                                </motion.li>
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0"></span>
                                    <p>Generic AI tools hallucinate citations or provide unverified answers.</p>
                                </motion.li>
                            </motion.ul>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-6">Lex AI is smarter.</h2>
                            <motion.ul variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4 text-muted-foreground">
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <p>One central library for all case documents, instantly searchable and organized by client and matter.</p>
                                </motion.li>
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <p>AI chat grounded in your actual documents — click any quote to jump to its exact location in the PDF.</p>
                                </motion.li>
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <p>Interactive argument maps that reveal the relationships between claims, evidence, and contradictions.</p>
                                </motion.li>
                                <motion.li variants={itemVariant} className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <p>Citation search backed by CanLII with verified results — no hallucinations, full audit trail.</p>
                                </motion.li>
                            </motion.ul>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="py-32 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold mb-4">From upload to insight in minutes.</h2>
                        <p className="text-xl text-muted-foreground">A workflow that takes you from raw documents to complete case intelligence.</p>
                    </div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
                    >
                        {steps.map((step, idx) => (
                            <motion.div key={idx} variants={fadeUpVariant} className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 relative">
                                    <step.icon className="w-8 h-8 text-primary" />
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border flex items-center justify-center font-bold text-sm shadow-sm">
                                        {idx + 1}
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                                <p className="text-muted-foreground">{step.desc}</p>
                                {idx < steps.length - 1 && (
                                    <ArrowRight className="hidden lg:block absolute right-0 top-8 text-muted/30 translate-x-1/2 -mr-4" />
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Feature Grid */}
            <section id="features" className="py-32 bg-muted/30 px-6">
                <div className="container mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold mb-4">Everything you need for case preparation.</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">AI-powered tools for document intelligence, citation research, and case analysis — all in one place.</p>
                    </div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {features.map((feature, idx) => (
                            <motion.div key={idx} variants={fadeUpVariant}>
                                <Card className="h-full border-border/50 bg-background/50 hover:bg-background hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300">
                                    <CardHeader>
                                        <feature.icon className="w-10 h-10 text-primary mb-4" strokeWidth={1.5} />
                                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Outputs Section */}
            <section className="py-32 px-6">
                <div className="container mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUpVariant}
                    >
                        <h2 className="text-4xl font-bold mb-6">Tangible, actionable deliverables.</h2>
                        <p className="text-lg text-muted-foreground mb-8">
                            More than chat responses. Lex AI produces structured outputs you can use directly in case preparation, filing, and team coordination.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <FolderOpen className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Authority Binder Packs</h4>
                                    <p className="text-muted-foreground text-sm">Curated, exportable JSON packs of verified citations with key passages and source metadata.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Map className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Visual Argument Maps</h4>
                                    <p className="text-muted-foreground text-sm">Interactive graphs showing claims, supporting evidence, and contradictions across your case.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">AI-Grounded Summaries</h4>
                                    <p className="text-muted-foreground text-sm">Document summaries and Q&A answers with direct references back to source PDFs.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUpVariant}
                        className="rounded-2xl bg-zinc-950 p-8 border border-zinc-800 shadow-xl overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-0 right-0 h-12 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                            </div>
                            <span className="ml-4 text-xs font-mono text-zinc-400">~/workspace/jones-v-smith</span>
                        </div>
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="mt-8 font-mono text-sm text-zinc-300"
                        >
                            <motion.div variants={itemVariant} className="flex items-center text-zinc-500 mb-2">
                                $ tree case_workspace/
                            </motion.div>
                            <motion.div variants={itemVariant} className="text-emerald-400 mb-1">case_workspace/</motion.div>
                            <motion.div variants={itemVariant} className="pl-4 border-l border-zinc-800 ml-2 space-y-2">
                                <motion.div variants={itemVariant} className="text-blue-400 mb-1">documents/</motion.div>
                                <motion.div variants={itemVariant} className="pl-4 border-l border-zinc-800 ml-2 space-y-2">
                                    <motion.div variants={itemVariant} className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> smith_deposition.pdf</motion.div>
                                    <motion.div variants={itemVariant} className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> exhibit_a.pdf</motion.div>
                                    <motion.div variants={itemVariant} className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> expert_report.docx</motion.div>
                                </motion.div>
                                <motion.div variants={itemVariant} className="text-blue-400 mt-2 mb-1">exports/</motion.div>
                                <motion.div variants={itemVariant} className="pl-4 border-l border-zinc-800 ml-2 space-y-2">
                                    <motion.div variants={itemVariant} className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> authority_binder.json</motion.div>
                                    <motion.div variants={itemVariant} className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> argument_map.svg</motion.div>
                                </motion.div>
                            </motion.div>
                            <motion.div variants={itemVariant} className="mt-6 text-zinc-500">
                                5 files, 2 directories. Indexed & chat-ready.
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Security & Governance */}
            <section id="security" className="py-32 bg-primary text-primary-foreground px-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                <div className="container mx-auto relative z-10">
                    <div className="max-w-3xl mb-16">
                        <h2 className="text-4xl font-bold mb-6">Security & Governance by Design</h2>
                        <p className="text-primary-foreground/80 text-xl">Built to satisfy the most stringent infosec reviews and operational guidelines.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                        <div>
                            <Shield className="w-8 h-8 mb-4 opacity-80" />
                            <h3 className="font-semibold text-lg mb-2">Matter Scoping</h3>
                            <p className="text-primary-foreground/80 text-sm">Data strictly partitioned by client and matter. Zero cross-contamination risks.</p>
                        </div>
                        <div>
                            <Users className="w-8 h-8 mb-4 opacity-80" />
                            <h3 className="font-semibold text-lg mb-2">Access Control</h3>
                            <p className="text-primary-foreground/80 text-sm">SSO integration with role-based permissions tailored for attorneys, paralegals, and admins.</p>
                        </div>
                        <div>
                            <History className="w-8 h-8 mb-4 opacity-80" />
                            <h3 className="font-semibold text-lg mb-2">Audit Logs</h3>
                            <p className="text-primary-foreground/80 text-sm">Immutable tracking of who reviewed what, and when a source was fetched.</p>
                        </div>
                        <div>
                            <Download className="w-8 h-8 mb-4 opacity-80" />
                            <h3 className="font-semibold text-lg mb-2">Export Controls</h3>
                            <p className="text-primary-foreground/80 text-sm">Data never lingers. Automated retention policies and secure deletion workflows.</p>
                        </div>
                        <div className="lg:col-span-2">
                            <LinkIcon className="w-8 h-8 mb-4 opacity-80" />
                            <h3 className="font-semibold text-lg mb-2">Optional Paid Integrations</h3>
                            <p className="text-primary-foreground/80 text-sm">Bring your own credentials for LexisNexis, Westlaw, or PACER. Lex AI acts as a broker and never stores your raw authentication tokens.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer / Final CTA */}
            <footer className="bg-background pt-32 pb-12 px-6 border-t">
                <div className="container mx-auto text-center mb-24">
                    <h2 className="text-4xl font-bold mb-6">Ready to work smarter on your cases?</h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Upload your first document, let AI index it, and start asking questions in minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/dashboard" className="contents">
                            <Button size="lg" className="rounded-full h-12 px-8">
                                Go to App
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>

                    </div>
                </div>

                <div className="container mx-auto border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Lex AI</span>
                        <span>© {new Date().getFullYear()}</span>
                    </div>

                    <p className="italic text-xs bg-muted px-4 py-2 rounded-md">
                        Not legal advice. Platform output requires human review by a qualified attorney.
                    </p>

                    <div className="flex gap-6">
                        <a href="#" className="hover:text-foreground">Terms</a>
                        <a href="#" className="hover:text-foreground">Privacy</a>
                        <a href="#" className="hover:text-foreground">Security</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}