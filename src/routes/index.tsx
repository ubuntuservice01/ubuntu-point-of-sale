import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Coffee,
  Croissant,
  CupSoda,
  CakeSlice,
  Salad,
  Minus,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
  CheckCircle2,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ubuntu POS 360 — Point of Sale" },
      {
        name: "description",
        content:
          "Ubuntu POS 360: a fast, warm point-of-sale till with product grid, cart, and checkout.",
      },
      { property: "og:title", content: "Ubuntu POS 360 — Point of Sale" },
      {
        property: "og:description",
        content:
          "Ubuntu POS 360: a fast, warm point-of-sale till with product grid, cart, and checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PosPage,
});

type Category = "Coffee" | "Bakery" | "Cold Drinks" | "Desserts" | "Light Meals";

type Product = {
  id: string;
  name: string;
  price: number;
  category: Category;
  icon: keyof typeof categoryIcons;
};

const categoryIcons = {
  Coffee,
  Bakery: Croissant,
  "Cold Drinks": CupSoda,
  Desserts: CakeSlice,
  "Light Meals": Salad,
} as const;

const categories: Category[] = [
  "Coffee",
  "Bakery",
  "Cold Drinks",
  "Desserts",
  "Light Meals",
];

const products: Product[] = [
  { id: "espresso", name: "Espresso", price: 28, category: "Coffee", icon: "Coffee" },
  { id: "flat-white", name: "Flat White", price: 42, category: "Coffee", icon: "Coffee" },
  { id: "cappuccino", name: "Cappuccino", price: 40, category: "Coffee", icon: "Coffee" },
  { id: "rooibos-latte", name: "Rooibos Latte", price: 38, category: "Coffee", icon: "Coffee" },
  { id: "croissant", name: "Butter Croissant", price: 32, category: "Bakery", icon: "Bakery" },
  { id: "muffin", name: "Bran Muffin", price: 26, category: "Bakery", icon: "Bakery" },
  { id: "sourdough", name: "Sourdough Toast", price: 30, category: "Bakery", icon: "Bakery" },
  { id: "iced-tea", name: "Iced Rooibos Tea", price: 30, category: "Cold Drinks", icon: "Cold Drinks" },
  { id: "smoothie", name: "Mango Smoothie", price: 48, category: "Cold Drinks", icon: "Cold Drinks" },
  { id: "juice", name: "Fresh Orange Juice", price: 36, category: "Cold Drinks", icon: "Cold Drinks" },
  { id: "malva", name: "Malva Pudding", price: 45, category: "Desserts", icon: "Desserts" },
  { id: "cheesecake", name: "Granadilla Cheesecake", price: 52, category: "Desserts", icon: "Desserts" },
  { id: "salad", name: "Harvest Salad Bowl", price: 68, category: "Light Meals", icon: "Light Meals" },
  { id: "toastie", name: "Cheese & Tomato Toastie", price: 55, category: "Light Meals", icon: "Light Meals" },
  { id: "wrap", name: "Chicken Mayo Wrap", price: 62, category: "Light Meals", icon: "Light Meals" },
];

type CartLine = { product: Product; qty: number };

type PaymentMethod = "cash" | "card" | "mobile";

const formatRand = (n: number) => `R ${n.toFixed(2)}`;

function PosPage() {
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [completed, setCompleted] = useState<null | { total: number; count: number; method: PaymentMethod }>(null);

  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          (activeCategory === "All" || p.category === activeCategory) &&
          p.name.toLowerCase().includes(query.toLowerCase())
      ),
    [activeCategory, query]
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === id ? { ...l, qty: Math.max(0, l.qty + delta) } : l
        )
        .filter((l) => l.qty > 0)
    );
  };

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.product.id !== id));

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  const charge = () => {
    if (cart.length === 0) return;
    setCompleted({ total, count: itemCount, method });
    setCart([]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Ubuntu <span className="text-primary">POS 360</span>
          </h1>
          <p className="text-xs text-muted-foreground">Till 1 · Morning shift</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-64 rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Products */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            {(["All", ...categories] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const Icon = categoryIcons[p.icon];
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
                >
                  <span className="rounded-lg bg-secondary p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{p.name}</span>
                  <span className="text-sm font-bold text-primary">{formatRand(p.price)}</span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                No products match your search.
              </p>
            )}
          </div>
        </main>

        {/* Cart */}
        <aside className="flex w-96 flex-col border-l border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Current sale</h2>
            <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {cart.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Tap products to add them to the sale.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((l) => (
                  <li key={l.product.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRand(l.product.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => changeQty(l.product.id, -1)}
                        className="rounded-md bg-secondary p-1 text-secondary-foreground hover:bg-muted"
                        aria-label={`Decrease ${l.product.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                      <button
                        onClick={() => changeQty(l.product.id, 1)}
                        className="rounded-md bg-secondary p-1 text-secondary-foreground hover:bg-muted"
                        aria-label={`Increase ${l.product.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-16 text-right text-sm font-semibold">
                      {formatRand(l.product.price * l.qty)}
                    </span>
                    <button
                      onClick={() => removeLine(l.product.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${l.product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-5 py-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd>{formatRand(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>VAT (15%)</dt>
                <dd>{formatRand(vat)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-primary">{formatRand(total)}</dd>
              </div>
            </dl>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {(
                [
                  { id: "cash", label: "Cash", Icon: Banknote },
                  { id: "card", label: "Card", Icon: CreditCard },
                  { id: "mobile", label: "Mobile", Icon: Smartphone },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    method === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={charge}
              disabled={cart.length === 0}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Charge {formatRand(total)}
            </button>
          </div>
        </aside>
      </div>

      {/* Receipt modal */}
      {completed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-lg font-bold">Payment complete</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {completed.count} item{completed.count === 1 ? "" : "s"} · Paid by{" "}
              {completed.method === "cash"
                ? "cash"
                : completed.method === "card"
                  ? "card"
                  : "mobile"}
            </p>
            <p className="mt-4 text-3xl font-bold text-primary">
              {formatRand(completed.total)}
            </p>
            <button
              onClick={() => setCompleted(null)}
              className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              New sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
