"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    ArrowLeft, 
    ShoppingBasket, 
    Camera, 
    Sparkles, 
    Store, 
    Moon, 
    Sun, 
    BookOpen, 
    ShoppingBag, 
    TrendingUp, 
    Share2, 
    CheckCircle2 
} from 'lucide-react';

export default function GuidePage() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [weeklySpend, setWeeklySpend] = useState<number>(80);

    // Initialize theme from html class
    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(isDark ? 'dark' : 'light');
    }, []);

    // Toggle theme
    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('posokanei_theme', nextTheme);
        if (nextTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Calculate savings
    const yearlySavings = Math.round(weeklySpend * 0.28 * 52); // Estimate 28% savings using optimal split basket

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 flex flex-col">
            
            {/* Header */}
            <header className="p-4 border-b border-border-custom bg-panel-bg flex items-center justify-between sticky top-0 z-50 shadow-sm backdrop-blur-md bg-opacity-80">
                <div className="flex items-center gap-3">
                    <Link 
                        href="/"
                        className="p-2 hover:bg-input-custom rounded-xl transition text-foreground flex items-center justify-center"
                        title="Επιστροφή στην Αρχική"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <ShoppingBasket className="w-6 h-6 text-indigo-500" />
                        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">MySuper.gr</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleTheme} 
                        className="p-2.5 hover:bg-input-custom border border-border-custom rounded-xl transition text-foreground"
                        title="Αλλαγή Θέματος"
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>
                    <Link 
                        href="/" 
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition duration-200"
                    >
                        Είσοδος στην Εφαρμογή
                    </Link>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 md:py-16 space-y-16">
                
                {/* Hero Title */}
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Οδηγός Χρήσης & Δυνατοτήτων</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 dark:from-white dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent">
                        Πώς να Εξοικονομήσετε Έως και 30% στο Σούπερ Μάρκετ
                    </h1>
                    <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 font-medium">
                        Το MySuper.gr συνδέεται απευθείας με την επίσημη κυβερνητική βάση δεδομένων e-katanalotis για να σας προσφέρει άμεση σύγκριση τιμών και έξυπνα εργαλεία βελτιστοποίησης.
                    </p>
                </div>

                {/* Abilities Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Feature 1 */}
                    <div className="bg-card-bg border border-border-custom p-8 rounded-3xl shadow-sm hover:shadow-md transition duration-300 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="p-4 bg-indigo-500/10 w-fit rounded-2xl">
                                <Store className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-850 dark:text-white">1. Σύγκριση Τιμών σε 6 Μεγάλες Αλυσίδες</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                Συγκρίνουμε καθημερινά τις τιμές για χιλιάδες κωδικούς προϊόντων στις μεγαλύτερες αλυσίδες σούπερ μάρκετ στην Ελλάδα: 
                                <strong className="text-slate-700 dark:text-slate-350 block mt-2">
                                    Lidl, ΑΒ Βασιλόπουλος, Μασούτης, MyMarket, Σκλαβενίτης, Κρητικός.
                                </strong>
                            </p>
                        </div>
                        <ul className="space-y-2 border-t border-border-custom pt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Αυτόματη ενημέρωση τιμών καθημερινά</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Ένδειξη προσφορών και ποσοστών έκπτωσης</span>
                            </li>
                        </ul>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-card-bg border border-border-custom p-8 rounded-3xl shadow-sm hover:shadow-md transition duration-300 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-500/10 w-fit rounded-2xl">
                                <Camera className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-850 dark:text-white">2. Άμεση Σάρωση Barcode (Scan)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                Είστε στο κατάστημα και θέλετε να μάθετε αν το προϊόν που κρατάτε είναι φθηνότερο αλλού; 
                                Απλά ανοίξτε την κάμερα του κινητού σας, σαρώστε το barcode και δείτε αμέσως τις τιμές σε όλα τα άλλα καταστήματα.
                            </p>
                        </div>
                        <ul className="space-y-2 border-t border-border-custom pt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Δεν απαιτείται εγκατάσταση εφαρμογής</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Λειτουργεί άμεσα από τον browser του κινητού σας</span>
                            </li>
                        </ul>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-card-bg border border-border-custom p-8 rounded-3xl shadow-sm hover:shadow-md transition duration-300 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-500/10 w-fit rounded-2xl">
                                <ShoppingBag className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-850 dark:text-white">3. Επιλογή Α: Όλα από Ένα Κατάστημα</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                Προσθέστε τα αγαπημένα σας προϊόντα στο καλάθι. Η εφαρμογή θα υπολογίσει το συνολικό κόστος για κάθε σούπερ μάρκετ ξεχωριστά και θα σας δείξει ποια αλυσίδα είναι η φθηνότερη για να κάνετε όλες τις αγορές σας από εκεί.
                            </p>
                        </div>
                        <ul className="space-y-2 border-t border-border-custom pt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Ιδανικό για γρήγορες αγορές χωρίς περιττές μετακινήσεις</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Υπολογισμός συνολικού κόστους καλαθιού με ένα κλικ</span>
                            </li>
                        </ul>
                    </div>

                    {/* Feature 4 */}
                    <div className="bg-card-bg border border-border-custom p-8 rounded-3xl shadow-sm hover:shadow-md transition duration-300 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="p-4 bg-violet-500/10 w-fit rounded-2xl">
                                <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-850 dark:text-white">4. Επιλογή Β: Έξυπνος Διαμοιρασμός (Split-Trip)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                Αν θέλετε τη μέγιστη δυνατή οικονομία, ο έξυπνος αλγόριθμος διαμοιράζει τα προϊόντα του καλαθιού σας στα αντίστοιχα σούπερ μάρκετ που τα έχουν στη χαμηλότερη τιμή. Έτσι, γνωρίζετε ακριβώς τι θα αγοράσετε από πού.
                            </p>
                        </div>
                        <ul className="space-y-2 border-t border-border-custom pt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Μέγιστη εξοικονόμηση χρημάτων έως και 30%</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Λίστα αγορών οργανωμένη ανά κατάστημα</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Interactive Savings Calculator */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-indigo-500/20 space-y-8">
                    <div className="max-w-2xl space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold">
                            <TrendingUp className="w-4 h-4" />
                            <span>Υπολογισμός Ετήσιου Κέρδους</span>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight">Δείτε πόσα χρήματα μπορείτε να γλιτώσετε</h2>
                        <p className="text-sm text-indigo-200">
                            Σύμφωνα με τα στατιστικά μας στοιχεία, οι χρήστες που χρησιμοποιούν τον έξυπνο διαμοιρασμό καλαθιού εξοικονομούν κατά μέσο όρο 25% με 30% στις εβδομαδιαίες αγορές τους.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-t border-white/10 pt-8">
                        {/* Spend Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-indigo-200">Μηνιαία/Εβδομαδιαία Έξοδα Σούπερ Μάρκετ:</span>
                                <span className="text-2xl font-extrabold text-white">€{weeklySpend} / εβδομάδα</span>
                            </div>
                            <input 
                                type="range" 
                                min="20" 
                                max="300" 
                                value={weeklySpend} 
                                onChange={(e) => setWeeklySpend(Number(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                            />
                            <div className="flex justify-between text-xs text-indigo-300">
                                <span>€20</span>
                                <span>€150</span>
                                <span>€300</span>
                            </div>
                        </div>

                        {/* Calculated Savings display */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center space-y-2">
                            <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">Εκτιμώμενη Ετήσια Εξοικονόμηση</span>
                            <strong className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent block">
                                ~ €{yearlySavings.toLocaleString('el-GR')}
                            </strong>
                            <span className="text-[11px] text-slate-400 block font-medium">
                                *Υπολογισμένο με βάση μέση εξοικονόμηση 28% στο καλάθι
                            </span>
                        </div>
                    </div>
                </div>

                {/* Additional Quick Features */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-center text-slate-850 dark:text-white">Άλλες Χρήσιμες Δυνατότητες</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            {
                                title: "Ιστορικό Τιμών",
                                desc: "Διαγράμματα εξέλιξης τιμών για κάθε προϊόν για να γνωρίζετε αν η τρέχουσα τιμή είναι όντως συμφέρουσα.",
                                icon: <TrendingUp className="w-5 h-5 text-indigo-500" />
                            },
                            {
                                title: "Κοινή Χρήση Λίστας",
                                desc: "Μοιραστείτε το καλάθι σας μέσω Viber / WhatsApp με την οικογένειά σας με ένα απλό κλικ.",
                                icon: <Share2 className="w-5 h-5 text-emerald-500" />
                            },
                            {
                                title: "Απευθείας e-Shop",
                                desc: "Σας παραπέμπουμε απευθείας στη σελίδα αναζήτησης του αντίστοιχου σουπερμάρκετ για άμεση παραγγελία.",
                                icon: <ShoppingBag className="w-5 h-5 text-amber-500" />
                            }
                        ].map((feat, idx) => (
                            <div key={idx} className="p-6 bg-card-bg border border-border-custom rounded-2xl space-y-3">
                                <div className="p-2.5 bg-input-custom rounded-xl w-fit">{feat.icon}</div>
                                <h4 className="text-base font-bold text-slate-850 dark:text-white">{feat.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ready to start */}
                <div className="text-center py-8 border-t border-border-custom space-y-4">
                    <h3 className="text-xl font-bold">Έτοιμοι να ξεκινήσετε την εξοικονόμηση;</h3>
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-2xl shadow-lg transition duration-200"
                    >
                        <span>Επιστροφή στην Αρχική & Αναζήτηση</span>
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                </div>

            </main>

            {/* Footer */}
            <footer className="p-6 border-t border-border-custom bg-panel-bg text-center text-xs text-slate-400 mt-auto">
                <div>MySuper.gr &copy; {new Date().getFullYear()} — Με τη δύναμη του PosoKanei / e-katanalotis API.</div>
            </footer>

        </div>
    );
}
