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
    X
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
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const steps = [
        { title: "Upload Draft", desc: "Drag and drop your briefly formatted Word/PDF document.", icon: FileText },
        { title: "Extract & Resolve", desc: "We identify all citations and map them to canonical authorities.", icon: Search },
        { title: "Human Review", desc: "Review ambiguous matches and approve fetched sources.", icon: CheckSquare },
        { title: "Export Pack", desc: "Generate a fully referenced, auditable package.", icon: Download }
    ];

    const features = [
        { title: "Citation Extractor", desc: "Accurately identifies case names, citations, and pin-cites.", icon: Search },
        { title: "Resolver w/ Ambiguity", desc: "Flags multiple or invalid matches for human review without guessing.", icon: AlertCircle },
        { title: "Document Fetcher", desc: "Automatically pulls full text from official and open sources.", icon: Download },
        { title: "Pinpoint Snippets", desc: "Locates and highlights the exact paragraph of your pin-cite.", icon: BookOpen },
        { title: "Client/Matter Scoping", desc: "Keep data silos strictly separated by client and matter numbers.", icon: Users },
        { title: "Grounded Answers Only", desc: "No source means no claim. Hallucination risk mitigated by design.", icon: CheckCircle2 },
        { title: "Human Review", desc: "Intuitive interface to approve, reject, or correct matches.", icon: CheckSquare },
        { title: "Audit Trail", desc: "Full provenance tracking. Know exactly when and where a document was sourced.", icon: History }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/20">

            {/* Top Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {"{{"}
                        </div>
                        <span className="font-bold text-lg tracking-tight">{"{{PROJECT_NAME}}"}</span>
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
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
                <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">

                    <motion.div
                        style={!shouldReduceMotion ? { opacity: heroOpacity, scale: heroScale } : undefined}
                        className="flex flex-col gap-6"
                    >
                        <Badge variant="outline" className="w-fit rounded-full px-4 py-1.5 border-primary/20 bg-primary/5 text-primary">
                            <Shield className="w-3.5 h-3.5 mr-2 inline" />
                            Built for Legal Operations
                        </Badge>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                            The Defensible <br className="hidden md:block" /> Authority Companion.
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                            {"{{PROJECT_NAME}}"} automatically extracts, resolves, and fetches legal citations from your drafts, generating a court-ready, fully-auditable package.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <Link href="/dashboard" className="contents">
                                <Button size="lg" className="rounded-full h-12 px-8 text-base">
                                    Go to App
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="rounded-full h-12 px-8 text-base">
                                View Sample Output
                            </Button>
                        </div>

                        {/* Trust Strip */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 pt-8 border-t border-border/50 text-sm font-medium text-muted-foreground">
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Client/Matter scoped</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Grounded outputs</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Review workflow</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Audit trail</span>
                        </div>
                    </motion.div>

                    <motion.div
                        style={!shouldReduceMotion ? { y: previewY, opacity: previewOpacity, filter: previewBlur } : undefined}
                        className="relative"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary/30 to-muted/30 rounded-[2rem] blur-xl opacity-50"></div>
                        <Card className="relative bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl overflow-hidden">
                            <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/20">
                                <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                                <div className="w-3 h-3 rounded-full bg-warning/80 bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                            </div>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-semibold text-lg">Citations Found</h3>
                                        <p className="text-sm text-muted-foreground">Brief_v2_final.pdf</p>
                                    </div>
                                    <div className="flex gap-2 text-xs font-medium">
                                        <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">12 Resolved</span>
                                        <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">2 Ambiguous</span>
                                        <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">1 Unresolved</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-start justify-between p-3 rounded-lg border bg-background/50">
                                            <div className="flex gap-3">
                                                <div className={`mt-0.5 w-2 h-2 rounded-full ${i === 2 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                                <div>
                                                    <p className="font-medium text-sm">Smith v. Jones, 123 F.3d 456</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                        <LinkIcon className="w-3 h-3" /> Found in OpenJurist
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] uppercase">
                                                {i === 2 ? 'Review' : 'Verified'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>

                                <Separator className="my-6" />

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Export Options</span>
                                    <div className="flex gap-2">
                                        <Button size="xs" variant="outline" className="h-7 text-xs">PDF</Button>
                                        <Button size="xs" variant="outline" className="h-7 text-xs">JSON</Button>
                                        <Button size="xs" className="h-7 text-xs"><Download className="w-3 h-3 mr-1" /> ZIP</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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
                            <h2 className="text-3xl font-bold mb-6">The old way is risky.</h2>
                            <ul className="space-y-4 text-muted-foreground">
                                <li className="flex gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0"></span>
                                    <p>Paralegals spend hours hunting down references in disparate databases.</p>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0"></span>
                                    <p>Generic AI tools hallucinate citations or provide unverified links.</p>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0"></span>
                                    <p>No clear audit trail of who verified which document and when.</p>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-6">{"{{PROJECT_NAME}}"} is defensible.</h2>
                            <ul className="space-y-4 text-muted-foreground">
                                <li className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <p>Instant extraction mapping directly to verifiable, canonical authorities.</p>
                                </li>
                                <li className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <p>Strict governance workflow that requires human sign-off on ambiguous cites.</p>
                                </li>
                                <li className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <p>Comprehensive export packages ready for filing or opposing counsel.</p>
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="py-32 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold mb-4">A workflow built for rigor.</h2>
                        <p className="text-xl text-muted-foreground">From draft to verifiable authority pack in minutes.</p>
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
                        <h2 className="text-4xl font-bold mb-4">Enterprise-grade capabilities.</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to ensure citations are accurate, sourced, and properly scoped.</p>
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
                                <Card className="h-full border-border/50 bg-background/50 hover:bg-background transition-colors duration-300">
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
                        <h2 className="text-4xl font-bold mb-6">Tangible, court-ready deliverables.</h2>
                        <p className="text-lg text-muted-foreground mb-8">
                            We don't just generate a chat response. {"{{PROJECT_NAME}}"} compiles a complete, structured package of authorities ready for integration into your document management system or direct filing.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Interactive PDF Report</h4>
                                    <p className="text-muted-foreground text-sm">A clean, hyperlinked summary of all citations and their statuses.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Download className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Manifest & Checksums</h4>
                                    <p className="text-muted-foreground text-sm">Cryptographic verification that the sources remain unaltered.</p>
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
                            <span className="ml-4 text-xs font-mono text-zinc-400">~/exports/matter-84920</span>
                        </div>
                        <div className="mt-8 font-mono text-sm text-zinc-300">
                            <div className="flex items-center text-zinc-500 mb-2">
                                $ tree authority_pack_v1/
                            </div>
                            <div className="text-emerald-400 mb-1">authority_pack_v1/</div>
                            <div className="pl-4 border-l border-zinc-800 ml-2 space-y-2">
                                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> authority_report.pdf</div>
                                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> citations_data.json</div>
                                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> manifest.sha256</div>
                                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> sources.zip</div>
                            </div>
                            <div className="mt-6 text-zinc-500">
                                4 files, 1 directory. 24MB total size.
                            </div>
                        </div>
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
                            <p className="text-primary-foreground/80 text-sm">Bring your own credentials for LexisNexis, Westlaw, or PACER. {"{{PROJECT_NAME}}"} acts as a broker and never stores your raw authentication tokens.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer / Final CTA */}
            <footer className="bg-background pt-32 pb-12 px-6 border-t">
                <div className="container mx-auto text-center mb-24">
                    <h2 className="text-4xl font-bold mb-6">Ready to secure your citations?</h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Stop wasting hours on manual verification and start building defensible authority packs today.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/dashboard" className="contents">
                            <Button size="lg" className="rounded-full h-12 px-8">
                                Go to App
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="rounded-full h-12 px-8">
                            Contact Sales
                        </Button>
                    </div>
                </div>

                <div className="container mx-auto border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{"{{PROJECT_NAME}}"}</span>
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