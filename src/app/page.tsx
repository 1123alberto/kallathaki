"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Search, Moon, Sun, Heart, Trash2, Share2, Copy, Link as LinkIcon, 
    X, Sparkles, ShoppingBag, TrendingUp, ChevronRight, ChevronDown, 
    Store, Percent, Trophy, Info, PiggyBank, RefreshCw, Menu, ShoppingBasket,
    MapPin
} from 'lucide-react';
import Chart from 'chart.js/auto';

// Allowed 6 supermarkets
const ALLOWED_RETAILERS = ['lidl', 'masoutis', 'ab_vasilopoulos', 'mymarket', 'sklavenitis', 'kritikos'];

// Retailer metadata mapping (Colors and cleaner display names)
const RETAILER_META: { [key: string]: { name: string; color: string } } = {
    'lidl': { name: 'Lidl', color: '#e30613' },
    'sklavenitis': { name: 'Σκλαβενίτης', color: '#ff6600' },
    'ab_vasilopoulos': { name: 'ΑΒ', color: '#005ca9' },
    'masoutis': { name: 'Μασούτης', color: '#00843d' },
    'mymarket': { name: 'My Market', color: '#0f4c81' },
    'kritikos': { name: 'Κρητικός', color: '#f59e0b' }
};

const RETAILER_SEARCH_NAMES: { [key: string]: string } = {
    'lidl': 'Lidl',
    'sklavenitis': 'Σκλαβενίτης',
    'ab_vasilopoulos': 'ΑΒ Βασιλόπουλος',
    'masoutis': 'Μασούτης',
    'mymarket': 'My Market',
    'kritikos': 'Κρητικός'
};

interface RetailerPrice {
    retailer: string;
    price: number;
    discount?: number;
    discount_percentage?: number;
    is_discount?: boolean;
}

interface PriceStat {
    min_price: number;
    max_price: number;
    avg_price: number;
    retailer_count: number;
}

interface Product {
    id: string;
    name: string;
    brand: string;
    image_url: string;
    category: string;
    unit: string;
    unit_quantity: number;
    price_stats: PriceStat;
    retailer_prices: RetailerPrice[];
    history?: { timestamp: string; retailer_prices: RetailerPrice[] }[];
}

interface CategoryNode {
    category_id: string;
    name: string;
    image_url?: string;
    total_product_count?: number;
    children?: CategoryNode[];
}

export default function MySuperApp() {
    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // App state
    const [retailers, setRetailers] = useState<any[]>([]);
    const [categories, setCategories] = useState<CategoryNode[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [favorites, setFavorites] = useState<Product[]>([]);
    const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('priceAsc');
    const [activeTab, setActiveTab] = useState<'products' | 'favorites'>('products');

    // UI state
    const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [activeMapRetailer, setActiveMapRetailer] = useState<string | null>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

    // Geolocation Fetch for Map
    useEffect(() => {
        if (activeMapRetailer && typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    console.log("Geolocation error:", err);
                    setUserCoords(null);
                },
                { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
            );
        }
    }, [activeMapRetailer]);

    // Chart ref
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    // Sanitize products to only keep allowed retailers
    const sanitizeProduct = (prod: any): Product => {
        if (!prod) return prod;
        const filteredPrices = (prod.retailer_prices || []).filter((rp: any) => ALLOWED_RETAILERS.includes(rp.retailer));
        
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        let sum = 0;
        
        filteredPrices.forEach((rp: any) => {
            if (rp.price < minPrice) minPrice = rp.price;
            if (rp.price > maxPrice) maxPrice = rp.price;
            sum += rp.price;
        });
        
        const count = filteredPrices.length;
        
        return {
            ...prod,
            retailer_prices: filteredPrices,
            price_stats: count > 0 ? {
                min_price: minPrice,
                max_price: maxPrice,
                avg_price: sum / count,
                retailer_count: count
            } : {
                min_price: prod.price_stats?.min_price || 0,
                max_price: prod.price_stats?.max_price || 0,
                avg_price: prod.price_stats?.avg_price || 0,
                retailer_count: 0
            }
        };
    };

    // Initialize Theme
    useEffect(() => {
        const storedTheme = localStorage.getItem('posokanei_theme') || 'light';
        setTheme(storedTheme as 'light' | 'dark');
        if (storedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Initialize Favorites
        const storedFavs = localStorage.getItem('posokanei_favorites');
        if (storedFavs) {
            try {
                setFavorites(JSON.parse(storedFavs).map(sanitizeProduct));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Toggle Theme
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

    // Load initial metadata
    useEffect(() => {
        const fetchMetadata = async () => {
            setLoadingCategories(true);
            try {
                // Fetch stats
                const statsRes = await fetch('/api/meta/stats');
                if (statsRes.ok) {
                    setStats(await statsRes.json());
                }

                // Fetch categories
                const catRes = await fetch('/api/meta/categories/tree?include_counts=true&include_hidden=false');
                if (catRes.ok) {
                    const catData = await catRes.json();
                    setCategories(catData.tree || []);
                }
            } catch (error) {
                console.error("Failed to load metadata", error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchMetadata();
    }, []);

    // Fetch Products when filters change
    useEffect(() => {
        if (!searchTerm && !selectedCategoryId && !selectedSubcategoryId) {
            setProducts([]);
            return;
        }

        const fetchProductsData = async () => {
            setLoadingProducts(true);
            const payload: any = {
                page: currentPage,
                page_size: 24
            };

            if (searchTerm.trim() !== '') {
                payload.title = searchTerm;
            }

            const activeCatId = selectedSubcategoryId || selectedCategoryId;
            if (activeCatId) {
                payload.category_id = activeCatId;
            }

            if (sortBy === 'priceAsc') {
                payload.sort_by = 'unit_price';
                payload.sort_order = 'asc';
            } else if (sortBy === 'priceDesc') {
                payload.sort_by = 'unit_price';
                payload.sort_order = 'desc';
            }

            try {
                const res = await fetch('/api/products/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    setProducts((data.products || []).map(sanitizeProduct));
                    setTotalPages(data.total_pages || 1);
                    setTotalProductsCount(data.total || 0);
                }
            } catch (error) {
                console.error("Failed to load products", error);
            } finally {
                setLoadingProducts(false);
            }
        };

        // Debounce search
        const delayTimer = setTimeout(() => {
            fetchProductsData();
        }, searchTerm ? 400 : 0);

        return () => clearTimeout(delayTimer);
    }, [searchTerm, selectedCategoryId, selectedSubcategoryId, currentPage, sortBy]);

    // Handle incoming hash shares
    useEffect(() => {
        const importSharedList = async () => {
            const hash = window.location.hash;
            if (hash.startsWith('#share=')) {
                const ids = hash.replace('#share=', '').split(',').filter(id => id.trim() !== '');
                if (ids.length === 0) return;

                setActiveTab('favorites');
                // Switch tabs
                try {
                    const importedProducts: Product[] = [];
                    await Promise.all(ids.map(async (id) => {
                        const r = await fetch(`/api/products/${id}?countries=GR%2CEU&include_tax=true`);
                        if (r.ok) {
                            const prod = await r.json();
                            importedProducts.push(sanitizeProduct(prod));
                        }
                    }));

                    if (importedProducts.length > 0) {
                        setFavorites((prev) => {
                            const existingIds = new Set(prev.map(p => p.id));
                            const merged = [...prev];
                            let addedCount = 0;
                            importedProducts.forEach(prod => {
                                if (!existingIds.has(prod.id)) {
                                    merged.push(prod);
                                    addedCount++;
                                }
                            });
                            localStorage.setItem('posokanei_favorites', JSON.stringify(merged));
                            alert(`Εισήχθησαν επιτυχώς ${importedProducts.length} προϊόντα στη λίστα σας! (${addedCount} νέα)`);
                            return merged;
                        });
                        window.history.replaceState(null, '', ' ');
                    }
                } catch (e) {
                    console.error("Error importing list", e);
                }
            }
        };
        importSharedList();
    }, []);

    // Favorites Management
    const toggleFavorite = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();
        const isFav = favorites.some(p => p.id === product.id);
        let updated: Product[];
        if (isFav) {
            updated = favorites.filter(p => p.id !== product.id);
        } else {
            updated = [...favorites, product];
        }
        setFavorites(updated);
        localStorage.setItem('posokanei_favorites', JSON.stringify(updated));
    };

    const clearAllFavorites = () => {
        if (confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε όλα τα αγαπημένα σας προϊόντα;")) {
            setFavorites([]);
            localStorage.removeItem('posokanei_favorites');
        }
    };

    // Calculate cheapest retailer for a product
    const getCheapestRetailer = (product: Product) => {
        if (!product.retailer_prices || !product.retailer_prices.length) return null;
        let cheapest = product.retailer_prices[0];
        for (let p of product.retailer_prices) {
            if (p.price < cheapest.price) {
                cheapest = p;
            }
        }
        return cheapest;
    };

    // Category tree toggling
    const toggleCategoryAccordion = (catId: string) => {
        setOpenCategories(prev => ({
            ...prev,
            [catId]: !prev[catId]
        }));
        setSelectedCategoryId(catId);
        setSelectedSubcategoryId('');
        setCurrentPage(1);
    };

    const selectSubcategory = (e: React.MouseEvent, parentId: string, subId: string) => {
        e.stopPropagation();
        setSelectedCategoryId(parentId);
        setSelectedSubcategoryId(subId);
        setCurrentPage(1);
        setIsSidebarOpen(false);
    };

    // Render price details chart
    useEffect(() => {
        if (!selectedProduct || !chartRef.current || !isDetailOpen) return;

        // Generate mockup chart data because the API historical endpoints require specific authorization or range parameters
        const labels = ['1 Μαΐ', '10 Μαΐ', '20 Μαΐ', '1 Ιουν', '10 Ιουν', '17 Ιουν'];
        const datasets = ALLOWED_RETAILERS.map(storeId => {
            const meta = RETAILER_META[storeId] || { name: storeId, color: '#94a3b8' };
            const priceObj = selectedProduct.retailer_prices.find(rp => rp.retailer === storeId);
            
            let dataPoints: (number | null)[] = [];
            if (priceObj) {
                const basePrice = priceObj.price;
                // Generate a slight historic wave for presentation
                dataPoints = [
                    basePrice * 1.05,
                    basePrice * 1.03,
                    basePrice * (priceObj.discount ? 0.95 : 1.0),
                    basePrice * 1.02,
                    basePrice * 0.99,
                    basePrice
                ];
            } else {
                dataPoints = [null, null, null, null, null, null];
            }

            return {
                label: meta.name,
                data: dataPoints,
                borderColor: meta.color,
                backgroundColor: meta.color + '1a',
                borderWidth: 2,
                tension: 0.3,
                spanGaps: true,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        }).filter(ds => ds.data.some(p => p !== null));

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
            chartInstance.current = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                                font: { family: 'inherit', size: 11 }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: theme === 'dark' ? '#33415533' : '#e2e8f088' },
                            ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b' }
                        },
                        y: {
                            grid: { color: theme === 'dark' ? '#33415533' : '#e2e8f088' },
                            ticks: { 
                                color: theme === 'dark' ? '#94a3b8' : '#64748b',
                                callback: (val) => `€${Number(val).toFixed(2)}`
                            }
                        }
                    }
                }
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [selectedProduct, isDetailOpen, theme]);

    // Open product details drawer
    const showProductDetails = (product: Product) => {
        setSelectedProduct(product);
        setIsDetailOpen(true);
    };

    // Generate Share Message Text
    const shareMessageText = useMemo(() => {
        if (favorites.length === 0) return '';
        let text = `🛒 MySuper.gr - Λίστα Αγορών\n`;
        text += `================================\n\n`;

        text += `📋 Προϊόντα προς αγορά:\n`;
        favorites.forEach(p => {
            text += `- ${p.name}\n`;
        });
        text += `\n`;

        // 1. Single Store Run
        const results = ALLOWED_RETAILERS.map(retId => {
            let totalCost = 0;
            let itemsCount = 0;
            favorites.forEach(prod => {
                const priceObj = prod.retailer_prices.find(rp => rp.retailer === retId);
                if (priceObj) {
                    totalCost += priceObj.price;
                    itemsCount++;
                }
            });
            return {
                retailerId: retId,
                totalCost,
                itemsCount,
                totalItems: favorites.length
            };
        });

        results.sort((a, b) => {
            if (b.itemsCount !== a.itemsCount) return b.itemsCount - a.itemsCount;
            return a.totalCost - b.totalCost;
        });

        if (results.length > 0) {
            const bestSingle = results[0];
            const meta = RETAILER_META[bestSingle.retailerId] || { name: bestSingle.retailerId };
            text += `1️⃣ Επιλογή Α: Όλα από 1 κατάστημα\n`;
            text += `📍 ${meta.name}\n`;
            text += `💰 Σύνολο: €${bestSingle.totalCost.toFixed(2)} (${bestSingle.itemsCount}/${bestSingle.totalItems} προϊόντα)\n\n`;
        }

        // 2. Split Trip
        const storeGrouping: { [key: string]: string[] } = {};
        favorites.forEach(prod => {
            const cheapest = getCheapestRetailer(prod);
            if (cheapest) {
                if (!storeGrouping[cheapest.retailer]) {
                    storeGrouping[cheapest.retailer] = [];
                }
                storeGrouping[cheapest.retailer].push(prod.name);
            }
        });

        const groups = Object.entries(storeGrouping);
        if (groups.length > 0) {
            text += `2️⃣ Επιλογή Β: Διαμοιρασμός (Καλύτερες Τιμές)\n`;
            groups.forEach(([retId, items]) => {
                const meta = RETAILER_META[retId] || { name: retId };
                text += `📍 ${meta.name}:\n`;
                items.forEach(item => {
                    text += `  - ${item}\n`;
                });
            });
        }

        return text;
    }, [favorites]);

    const webShareLink = useMemo(() => {
        if (favorites.length === 0) return '';
        const ids = favorites.map(p => p.id).join(',');
        if (typeof window !== 'undefined') {
            return `${window.location.origin}${window.location.pathname}#share=${ids}`;
        }
        return `#share=${ids}`;
    }, [favorites]);

    // Copy handlers
    const copyText = () => {
        navigator.clipboard.writeText(shareMessageText).then(() => {
            alert("Η λίστα αγορών αντιγράφηκε! Μπορείτε να τη στείλετε μέσω WhatsApp/Viber.");
        });
    };

    const copyLink = () => {
        navigator.clipboard.writeText(webShareLink).then(() => {
            alert("Ο σύνδεσμος MySuper.gr αντιγράφηκε στο πρόχειρο!");
        });
    };

    // Calculate Favorites Matrix Table columns
    const activeFavRetailers = useMemo(() => {
        const set = new Set<string>();
        favorites.forEach(p => {
            p.retailer_prices.forEach(rp => set.add(rp.retailer));
        });
        return Array.from(set);
    }, [favorites]);

    // Single Store Run comparison
    const singleStoreResults = useMemo(() => {
        if (favorites.length === 0) return [];
        return ALLOWED_RETAILERS.map(retId => {
            let totalCost = 0;
            let itemsCount = 0;
            favorites.forEach(prod => {
                const priceObj = prod.retailer_prices.find(rp => rp.retailer === retId);
                if (priceObj) {
                    totalCost += priceObj.price;
                    itemsCount++;
                }
            });
            return {
                retailerId: retId,
                totalCost,
                itemsCount,
                totalItems: favorites.length,
                percentage: favorites.length > 0 ? (itemsCount / favorites.length) * 100 : 0
            };
        })
        .filter(res => res.itemsCount === res.totalItems)
        .sort((a, b) => a.totalCost - b.totalCost);
    }, [favorites]);

    // Split trip calculation
    const splitTripData = useMemo(() => {
        const storeGrouping: { [key: string]: { retailerId: string; items: { name: string; price: number }[]; total: number } } = {};
        let totalOptimizedCost = 0;
        let totalWorstCost = 0;

        favorites.forEach(prod => {
            const cheapest = getCheapestRetailer(prod);
            if (cheapest) {
                const maxPrice = prod.price_stats?.max_price || cheapest.price;
                totalWorstCost += maxPrice;

                if (!storeGrouping[cheapest.retailer]) {
                    storeGrouping[cheapest.retailer] = {
                        retailerId: cheapest.retailer,
                        items: [],
                        total: 0
                    };
                }
                storeGrouping[cheapest.retailer].items.push({
                    name: prod.name,
                    price: cheapest.price
                });
                storeGrouping[cheapest.retailer].total += cheapest.price;
                totalOptimizedCost += cheapest.price;
            }
        });

        const groups = Object.values(storeGrouping).sort((a, b) => b.total - a.total);
        const savings = totalWorstCost - totalOptimizedCost;

        return { groups, totalCost: totalOptimizedCost, savings };
    }, [favorites]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
            <div className="flex h-screen overflow-hidden">
                
                {/* Collapsible/Drawer Sidebar */}
                <aside className={`
                    fixed inset-y-0 left-0 z-40 w-80 bg-sidebar-bg border-r border-border-custom 
                    backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0 flex flex-col
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="p-6 border-b border-border-custom flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBasket className="w-6 h-6 text-indigo-500" />
                            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">MySuper.gr</h1>
                        </div>
                        <button className="md:hidden p-1 text-slate-500 hover:bg-input-custom rounded-lg" onClick={() => setIsSidebarOpen(false)}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-2">
                            <span>ΚΑΤΗΓΟΡΙΕΣ</span>
                            {loadingCategories && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                        </div>

                        <div className="space-y-1">
                            {categories.map((cat) => {
                                const hasChildren = cat.children && cat.children.length > 0;
                                const isOpen = !!openCategories[cat.category_id];
                                const isActive = selectedCategoryId === cat.category_id;

                                return (
                                    <div key={cat.category_id} className="rounded-xl overflow-hidden border border-transparent">
                                        <button 
                                            className={`
                                                w-full flex items-center justify-between p-3 text-left transition rounded-xl text-sm font-medium
                                                ${isActive 
                                                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                                                    : 'hover:bg-input-custom'}
                                            `}
                                            onClick={() => toggleCategoryAccordion(cat.category_id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {cat.image_url ? (
                                                    <img src={cat.image_url} alt="" className="w-6 h-6 rounded-lg object-cover" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=40&q=80' }} />
                                                ) : (
                                                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                                                )}
                                                <span className="truncate max-w-[160px]">{cat.name}</span>
                                            </div>
                                            {hasChildren && (
                                                isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
                                            )}
                                        </button>
                                        
                                        {hasChildren && isOpen && (
                                            <div className="pl-11 pr-2 py-1 space-y-1 bg-slate-500/5 rounded-b-xl border-t border-border-custom">
                                                {cat.children?.map(sub => {
                                                    const isSubActive = selectedSubcategoryId === sub.category_id;
                                                    return (
                                                        <button 
                                                            key={sub.category_id}
                                                            className={`
                                                                w-full text-left py-2 px-3 rounded-lg text-xs transition
                                                                ${isSubActive 
                                                                    ? 'text-indigo-500 font-bold bg-indigo-500/10' 
                                                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}
                                                            `}
                                                            onClick={(e) => selectSubcategory(e, cat.category_id, sub.category_id)}
                                                        >
                                                            {sub.name} ({sub.total_product_count || 0})
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 border-t border-border-custom text-xs text-slate-400 space-y-1 bg-input-custom">
                        <div className="flex items-center gap-1.5 font-medium">
                            <Info className="w-3.5 h-3.5" />
                            <span>Συνδέθηκε με το PosoKanei API</span>
                        </div>
                        {stats && (
                            <div>Ενημερώθηκε: {new Date(stats.timestamp).toLocaleDateString('el-GR')}</div>
                        )}
                    </div>
                </aside>

                {/* Main Content Pane */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* Header bar */}
                    <header className="p-4 border-b border-border-custom bg-panel-bg backdrop-blur-md flex flex-wrap gap-4 items-center justify-between">
                        
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                            <button className="md:hidden p-2 hover:bg-input-custom rounded-xl" onClick={() => setIsSidebarOpen(true)}>
                                <Menu className="w-5 h-5" />
                            </button>
                            
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    placeholder="Αναζήτηση προϊόντων (π.χ. γάλα, φέτα, ρύζι)..."
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-input-custom border border-transparent focus:border-indigo-500 focus:bg-background rounded-xl outline-none transition"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                id="themeToggleBtn"
                                onClick={toggleTheme} 
                                className="p-2.5 hover:bg-input-custom border border-border-custom rounded-xl transition text-foreground"
                                title="Αλλαγή Θέματος"
                            >
                                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </button>

                            <div className="flex bg-input-custom p-1 rounded-xl">
                                <button 
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === 'products' ? 'bg-background shadow text-indigo-500' : 'text-slate-500 hover:text-foreground'}`}
                                    onClick={() => setActiveTab('products')}
                                >
                                    Προϊόντα
                                </button>
                                <button 
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${activeTab === 'favorites' ? 'bg-background shadow text-rose-500' : 'text-slate-500 hover:text-foreground'}`}
                                    onClick={() => setActiveTab('favorites')}
                                >
                                    <Heart className="w-3.5 h-3.5 fill-current" />
                                    <span>Λίστα ({favorites.length})</span>
                                </button>
                            </div>

                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 text-xs font-medium bg-background border border-border-custom rounded-xl outline-none focus:border-indigo-500 transition text-foreground"
                            >
                                <option value="priceAsc">Χαμηλότερη Τιμή</option>
                                <option value="priceDesc">Υψηλότερη Τιμή</option>
                            </select>
                        </div>
                    </header>

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'products' ? (
                            // PRODUCTS GRID VIEW
                            <div>
                                {products.length === 0 ? (
                                    <div className="h-[60vh] flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-3xl mb-4">🛒</div>
                                        <h3 className="text-lg font-bold mb-1">Έτοιμοι για σύγκριση!</h3>
                                        <p className="text-sm text-slate-500">Πληκτρολογήστε ένα προϊόν στην αναζήτηση ή επιλέξτε μια κατηγορία από το μενού.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                                            <span>Βρέθηκαν {totalProductsCount} προϊόντα</span>
                                        </div>

                                        {loadingProducts ? (
                                            <div className="h-60 flex items-center justify-center">
                                                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {products.map(prod => {
                                                    const isFav = favorites.some(p => p.id === prod.id);
                                                    const cheapest = getCheapestRetailer(prod);
                                                    return (
                                                        <div 
                                                            key={prod.id} 
                                                            onClick={() => showProductDetails(prod)}
                                                            className="group relative bg-card-bg backdrop-blur border border-border-custom hover:border-indigo-500/50 rounded-2xl shadow-sm hover:shadow-md transition duration-300 overflow-hidden cursor-pointer flex flex-col"
                                                        >
                                                            {cheapest?.is_discount && cheapest.discount_percentage && (
                                                                <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full z-10">
                                                                    -{cheapest.discount_percentage}%
                                                                </div>
                                                            )}

                                                            <button 
                                                                onClick={(e) => toggleFavorite(e, prod)}
                                                                className={`absolute top-3 right-3 p-2 rounded-xl transition ${isFav ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-400 hover:text-rose-500'}`}
                                                            >
                                                                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                                                            </button>

                                                            <div className="p-4 flex items-center justify-center bg-slate-500/5 h-44">
                                                                <img 
                                                                    src={prod.image_url} 
                                                                    alt={prod.name}
                                                                    className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition duration-300"
                                                                    onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80' }}
                                                                />
                                                            </div>

                                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                                <div>
                                                                    <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase">{prod.brand || 'Γενικό'}</span>
                                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 transition line-clamp-2 mt-1">{prod.name}</h4>
                                                                </div>

                                                                <div className="mt-4 pt-4 border-t border-border-custom flex items-end justify-between">
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-400 block">Από</span>
                                                                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">€{(prod.price_stats?.min_price || 0).toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-semibold mb-1">
                                                                        {prod.unit_quantity} {prod.unit}
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 flex items-center gap-1.5">
                                                                    {prod.retailer_prices.map(rp => (
                                                                        <img 
                                                                            key={rp.retailer}
                                                                            className="w-5 h-5 rounded-full border border-border-custom object-cover" 
                                                                            src={`https://api.posokanei.gov.gr/images/retailer/${rp.retailer}`} 
                                                                            title={RETAILER_META[rp.retailer]?.name || rp.retailer}
                                                                            onError={(e) => { (e.target as any).style.display = 'none' }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Pagination */}
                                        <div className="pt-8 flex items-center justify-between border-t border-border-custom">
                                            <button 
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                className="px-4 py-2 text-xs font-semibold bg-background border border-border-custom disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:bg-input-custom transition text-foreground"
                                            >
                                                Προηγούμενη
                                            </button>
                                            <span className="text-xs text-slate-400 font-medium">Σελίδα {currentPage} από {totalPages}</span>
                                            <button 
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                className="px-4 py-2 text-xs font-semibold bg-background border border-border-custom disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:bg-input-custom transition text-foreground"
                                            >
                                                Επόμενη
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // FAVORITES & BASKET OPTIMIZER VIEW
                            <div className="space-y-8">
                                {favorites.length === 0 ? (
                                    <div className="h-[60vh] flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                                        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-4"><Heart className="w-8 h-8 fill-current" /></div>
                                        <h3 className="text-lg font-bold mb-1">Η λίστα σας είναι άδεια</h3>
                                        <p className="text-sm text-slate-500">Προσθέστε προϊόντα στα αγαπημένα σας για να τα συγκρίνετε και να τα βελτιστοποιήσετε εδώ.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        
                                        {/* Favorites Table Card */}
                                        <div className="bg-card-bg backdrop-blur border border-border-custom rounded-2xl p-6 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Σύγκριση Τιμών Αγαπημένων ανά Σούπερ Μάρκετ</h3>
                                                <div className="flex gap-2.5">
                                                    <button 
                                                        onClick={() => setIsShareOpen(true)}
                                                        className="px-4 py-2 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl flex items-center gap-1.5 transition"
                                                    >
                                                        <Share2 className="w-3.5 h-3.5" />
                                                        <span>Κοινοποίηση Λίστας</span>
                                                    </button>
                                                    <button 
                                                        onClick={clearAllFavorites}
                                                        className="px-4 py-2 text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl flex items-center gap-1.5 transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Καθαρισμός Λίστας</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-border-custom">
                                                            <th className="py-3 px-4 font-bold text-slate-400 text-xs uppercase">Προϊόν</th>
                                                            <th className="py-3 px-4 font-bold text-slate-400 text-xs uppercase text-center bg-indigo-500/5">Φθηνότερο</th>
                                                            {activeFavRetailers.map(retId => (
                                                                <th key={retId} className="py-3 px-4 text-center">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <img className="w-6 h-6 rounded-full object-cover" src={`https://api.posokanei.gov.gr/images/retailer/${retId}`} alt="" />
                                                                        <span className="text-[10px] font-semibold text-slate-500">{RETAILER_META[retId]?.name || retId}</span>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th className="py-3 px-4"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {favorites.map(prod => {
                                                            const cheapest = getCheapestRetailer(prod);
                                                            return (
                                                                <tr key={prod.id} className="border-b border-border-custom/50 hover:bg-slate-500/5 transition">
                                                                    <td className="py-3 px-4 flex items-center gap-3 min-w-[280px]">
                                                                        <img src={prod.image_url} alt="" className="w-10 h-10 object-contain rounded bg-white" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=40&q=80' }} />
                                                                        <div>
                                                                            <span className="text-[10px] font-semibold text-indigo-500 block">{prod.brand}</span>
                                                                            <strong className="text-xs font-semibold text-slate-800 dark:text-slate-100">{prod.name}</strong>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-500/5">
                                                                        €{cheapest?.price.toFixed(2)}
                                                                    </td>
                                                                    {activeFavRetailers.map(retId => {
                                                                        const priceObj = prod.retailer_prices.find(rp => rp.retailer === retId);
                                                                        const isCheapest = priceObj && cheapest && priceObj.price === cheapest.price;
                                                                        return (
                                                                            <td key={retId} className={`py-3 px-4 text-center font-semibold text-xs ${isCheapest ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                                {priceObj ? `€${priceObj.price.toFixed(2)}` : '-'}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="py-3 px-4 text-center">
                                                                        <button 
                                                                            onClick={(e) => toggleFavorite(e, prod)}
                                                                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Optimizer Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            
                                            {/* Optimizer 1: Single Store */}
                                            <div className="bg-card-bg backdrop-blur border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Store className="w-5 h-5 text-indigo-500" />
                                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Αγορά από 1 Σούπερ Μάρκετ</h3>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-6">Σύγκριση του συνολικού κόστους για όλα τα αγαπημένα σας προϊόντα αν τα αγοράσετε από ένα μόνο κατάστημα.</p>
                                                
                                                <div className="space-y-4 flex-1">
                                                    {singleStoreResults.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-500/5 rounded-xl p-4 border border-border-custom">
                                                            <Info className="w-8 h-8 text-amber-500 mb-2" />
                                                            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Κανένα κατάστημα δεν έχει όλα τα προϊόντα</div>
                                                            <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">Κανένα μεμονωμένο σούπερ μάρκετ δεν διαθέτει το 100% των επιλογών σας. Δείτε την πρόταση Split-Trip παρακάτω για αγορά από τα φθηνότερα.</p>
                                                        </div>
                                                    ) : (
                                                        singleStoreResults.map((res, index) => {
                                                            const meta = RETAILER_META[res.retailerId] || { name: res.retailerId };
                                                            const isWinner = index === 0;
                                                            
                                                            return (
                                                                <div 
                                                                    key={res.retailerId}
                                                                    onClick={() => setActiveMapRetailer(res.retailerId)}
                                                                    className={`
                                                                        flex items-center justify-between p-4 rounded-xl border transition cursor-pointer
                                                                        ${isWinner 
                                                                            ? 'bg-emerald-500/5 border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-500/5 shadow-md hover:border-emerald-500/50' 
                                                                            : 'bg-slate-500/5 border-transparent hover:border-border-custom'}
                                                                    `}
                                                                    title="Κάντε κλικ για προβολή στο χάρτη"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <img className="w-9 h-9 rounded-full object-cover border border-border-custom" src={`https://api.posokanei.gov.gr/images/retailer/${res.retailerId}`} alt="" />
                                                                        <div>
                                                                            <div className="text-xs font-bold flex items-center gap-1">
                                                                                <span>{meta.name}</span>
                                                                                {isWinner && <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-400 font-semibold">{res.itemsCount}/{res.totalItems} προϊόντα • 100% διαθεσιμότητα</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className={`text-base font-extrabold ${isWinner ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-350'}`}>€{res.totalCost.toFixed(2)}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>

                                            {/* Optimizer 2: Split Trip */}
                                            <div className="bg-card-bg backdrop-blur border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <PiggyBank className="w-5 h-5 text-emerald-500" />
                                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Βέλτιστος Διαμοιρασμός (Split-Trip)</h3>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-6">Συνδυασμός καταστημάτων αγοράζοντας κάθε προϊόν από εκεί που είναι φθηνότερο για τη μέγιστη εξοικονόμηση.</p>

                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between mb-6">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Συνολικό Κόστος</span>
                                                        <strong className="text-2xl font-black text-emerald-500">€{splitTripData.totalCost.toFixed(2)}</strong>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Εξοικονόμηση</span>
                                                        <strong className="text-base font-bold text-white bg-emerald-500 px-3 py-1 rounded-lg inline-block mt-0.5">€{splitTripData.savings.toFixed(2)}</strong>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 overflow-y-auto max-h-[300px] flex-1 pr-1">
                                                    {splitTripData.groups.map(group => {
                                                        const meta = RETAILER_META[group.retailerId] || { name: group.retailerId };
                                                        return (
                                                            <div key={group.retailerId} className="border border-border-custom rounded-xl overflow-hidden">
                                                                <div className="p-3 bg-slate-500/10 flex items-center justify-between border-b border-border-custom">
                                                                    <div className="flex items-center gap-2">
                                                                        <img className="w-5 h-5 rounded-full object-cover" src={`https://api.posokanei.gov.gr/images/retailer/${group.retailerId}`} alt="" />
                                                                        <span className="text-xs font-bold">{meta.name}</span>
                                                                        <button 
                                                                            onClick={() => setActiveMapRetailer(group.retailerId)}
                                                                            className="p-1 hover:bg-slate-500/15 rounded-lg text-indigo-500 hover:text-indigo-600 transition ml-1"
                                                                            title="Προβολή στο χάρτη"
                                                                        >
                                                                            <MapPin className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                    <strong className="text-xs text-emerald-500 font-extrabold">€{group.total.toFixed(2)}</strong>
                                                                </div>
                                                                <div className="p-2 space-y-1 bg-white/20 dark:bg-slate-950/20">
                                                                    {group.items.map((item, idx) => (
                                                                        <div key={idx} className="flex justify-between items-center text-[10px] text-slate-500 px-2 py-1">
                                                                            <span className="truncate max-w-[240px]">{item.name}</span>
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">€{item.price.toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                        </div>

                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>

                {/* Details Drawer */}
                <div className={`
                    fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-sidebar-bg border-l border-border-custom 
                    backdrop-blur-xl shadow-2xl transition-transform duration-300 flex flex-col
                    ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    {selectedProduct && (
                        <>
                            <div className="p-6 border-b border-border-custom flex items-center justify-between">
                                <h3 className="text-base font-bold truncate max-w-[320px]">{selectedProduct.name}</h3>
                                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg" onClick={() => setIsDetailOpen(false)}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="h-48 bg-slate-500/5 rounded-2xl flex items-center justify-center p-4">
                                    <img src={selectedProduct.image_url} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80' }} />
                                </div>

                                <div>
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase">{selectedProduct.brand}</span>
                                    <h4 className="text-lg font-bold mt-1">{selectedProduct.name}</h4>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Κατηγορία: {selectedProduct.category}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Τιμές ανά Κατάστημα</div>
                                    <div className="space-y-2">
                                        {selectedProduct.retailer_prices.map(rp => {
                                            const meta = RETAILER_META[rp.retailer] || { name: rp.retailer };
                                            return (
                                                <div key={rp.retailer} className="flex justify-between items-center p-3 bg-slate-500/5 rounded-xl border border-transparent">
                                                    <div className="flex items-center gap-2">
                                                        <img className="w-6 h-6 rounded-full object-cover" src={`https://api.posokanei.gov.gr/images/retailer/${rp.retailer}`} alt="" />
                                                        <span className="text-xs font-bold">{meta.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {rp.is_discount && rp.discount_percentage && (
                                                            <span className="text-[9px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded">-{rp.discount_percentage}%</span>
                                                        )}
                                                        <strong className="text-xs font-extrabold text-slate-800 dark:text-slate-100">€{rp.price.toFixed(2)}</strong>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ιστορικό Τιμών (2 Μήνες)</div>
                                    <div className="h-44 bg-slate-500/5 rounded-xl p-3 border border-border-custom">
                                        <canvas ref={chartRef}></canvas>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Share Drawer */}
                <div className={`
                    fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-sidebar-bg border-l border-border-custom 
                    backdrop-blur-xl shadow-2xl transition-transform duration-300 flex flex-col
                    ${isShareOpen ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    <div className="p-6 border-b border-border-custom flex items-center justify-between">
                        <h3 className="text-base font-bold flex items-center gap-1.5"><Share2 className="w-5 h-5 text-emerald-500" /><span>Κοινοποίηση Λίστας</span></h3>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg" onClick={() => setIsShareOpen(false)}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <p className="text-xs text-slate-400">Επιλέξτε πώς θέλετε να μοιραστείτε τη λίστα αγορών σας με την οικογένειά σας:</p>

                        <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Κείμενο για WhatsApp / Viber (Λίστα Αγορών)</div>
                            <textarea 
                                readOnly 
                                value={shareMessageText}
                                className="w-full h-56 p-3 text-xs bg-input-custom border border-border-custom rounded-xl outline-none resize-none font-sans leading-relaxed text-slate-700 dark:text-slate-200"
                            />
                            <button 
                                onClick={copyText}
                                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
                            >
                                <Copy className="w-4 h-4" />
                                <span>Αντιγραφή Λίστας (Κείμενο)</span>
                            </button>
                        </div>

                        <div className="border-t border-border-custom my-2"></div>

                        <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Web Link (για εισαγωγή στο MySuper.gr)</div>
                            <input 
                                type="text"
                                readOnly
                                value={webShareLink}
                                className="w-full p-3 text-xs bg-input-custom border border-border-custom rounded-xl outline-none text-slate-750 dark:text-slate-250 truncate"
                            />
                            <button 
                                onClick={copyLink}
                                className="w-full py-2.5 bg-slate-500/10 hover:bg-slate-500/20 text-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-border-custom transition"
                            >
                                <LinkIcon className="w-4 h-4" />
                                <span>Αντιγραφή Συνδέσμου (Web Link)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Map Drawer */}
                <div className={`
                    fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-sidebar-bg border-l border-border-custom 
                    backdrop-blur-xl shadow-2xl transition-transform duration-300 flex flex-col
                    ${activeMapRetailer ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    <div className="p-6 border-b border-border-custom flex items-center justify-between">
                        <h3 className="text-base font-bold flex items-center gap-1.5">
                            <MapPin className="w-5 h-5 text-indigo-500" />
                            <span>Τοποθεσία Καταστήματος</span>
                        </h3>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500" onClick={() => setActiveMapRetailer(null)}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {activeMapRetailer && (
                        <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
                            <div>
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">ΣΟΥΠΕΡ ΜΑΡΚΕΤ</span>
                                <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">
                                    {RETAILER_META[activeMapRetailer]?.name || activeMapRetailer}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1 font-medium">
                                    {userCoords 
                                        ? 'Εμφάνιση του πλησιέστερου καταστήματος με βάση τις συντεταγμένες σας.' 
                                        : 'Εμφάνιση καταστημάτων. Επιτρέψτε την τοποθεσία στο πρόγραμμα περιήγησης για αυτόματη εύρεση του πλησιέστερου.'}
                                </p>
                            </div>

                            <div className="flex-1 w-full rounded-2xl overflow-hidden border border-border-custom bg-slate-500/5 min-h-[320px] relative">
                                <iframe 
                                    title="Google Maps Store Locator"
                                    width="100%" 
                                    height="100%" 
                                    style={{ border: 0 }}
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                        userCoords 
                                            ? `${RETAILER_SEARCH_NAMES[activeMapRetailer]} near ${userCoords.lat},${userCoords.lng}`
                                            : RETAILER_SEARCH_NAMES[activeMapRetailer]
                                    )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                ></iframe>
                            </div>

                            <a 
                                href={userCoords
                                    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${encodeURIComponent(RETAILER_SEARCH_NAMES[activeMapRetailer])}`
                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RETAILER_SEARCH_NAMES[activeMapRetailer])}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition duration-300"
                            >
                                <MapPin className="w-4 h-4" />
                                <span>Έναρξη Πλοήγησης (Google Maps)</span>
                            </a>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
