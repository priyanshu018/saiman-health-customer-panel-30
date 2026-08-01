"use client";

export type DemoPharmacyProduct = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  mrp: number;
  pharmacyName: string;
  inStock: number;
  tone: string;
  accent: string;
  imageUrl?: string | null;
  pharmacyId?: string | null;
  city?: string;
};

export type PharmacyCartLine = {
  productId: string;
  quantity: number;
};

const CART_KEY = "saiman-web-cart-v1";
const STORE_EVENT = "saiman-web-store-change";
const dynamicProducts = new Map<string, DemoPharmacyProduct>();

export const DEMO_PHARMACY_PRODUCTS: DemoPharmacyProduct[] = [
  {
    id: "apollo-glucose-monitor",
    name: "Apollo Pharmacy Smart Blood Glucose Monitor",
    subtitle: "Medicine",
    category: "Diabetes Medicines",
    price: 674.1,
    mrp: 776,
    pharmacyName: "Saiman Pharmacy",
    inStock: 20,
    tone: "linear-gradient(180deg, #eef2ff 0%, #fff7db 100%)",
    accent: "#2f59ff",
  },
  {
    id: "ensure-diabetes-care",
    name: "Ensure Diabetes Care Vanilla Delight Flavour",
    subtitle: "Medicine",
    category: "Diabetes Medicines",
    price: 1789.3,
    mrp: 1999,
    pharmacyName: "Saiman Pharmacy",
    inStock: 20,
    tone: "linear-gradient(180deg, #fff9e8 0%, #ffffff 100%)",
    accent: "#d4a017",
  },
  {
    id: "amrutanjan-roll-on",
    name: "Amrutanjan Headache Faster Roll On",
    subtitle: "Medicine",
    category: "Pain Relief",
    price: 70,
    mrp: 88,
    pharmacyName: "Saiman Pharmacy",
    inStock: 20,
    tone: "linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)",
    accent: "#10b981",
  },
  {
    id: "dr-ortho-oil",
    name: "Dr.Ortho Oil",
    subtitle: "Medicine",
    category: "Pain Relief",
    price: 276,
    mrp: 319,
    pharmacyName: "Saiman Pharmacy",
    inStock: 20,
    tone: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
    accent: "#2f59ff",
  },
];

for (const product of DEMO_PHARMACY_PRODUCTS) {
  dynamicProducts.set(product.id, product);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readStore<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
}

export function subscribeStore(key: string, callback: () => void) {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === key) callback();
  };

  const handleCustom = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (!detail || detail === key) callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORE_EVENT, handleCustom);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORE_EVENT, handleCustom);
  };
}

export function getCartLines() {
  return readStore<PharmacyCartLine[]>(CART_KEY, []);
}

export function setCartLines(lines: PharmacyCartLine[]) {
  writeStore(CART_KEY, lines);
}

export function clearCart() {
  setCartLines([]);
}

export function registerPharmacyProducts(products: DemoPharmacyProduct[]) {
  for (const product of products) {
    dynamicProducts.set(product.id, product);
  }
  writeStore(CART_KEY, getCartLines());
}

export function addProductToCart(productOrId: string | DemoPharmacyProduct) {
  const productId = typeof productOrId === "string" ? productOrId : productOrId.id;
  if (typeof productOrId !== "string") {
    dynamicProducts.set(productId, productOrId);
  }
  const lines = getCartLines();
  const existing = lines.find((line) => line.productId === productId);
  if (existing) {
    existing.quantity += 1;
    setCartLines([...lines]);
    return;
  }
  setCartLines([...lines, { productId, quantity: 1 }]);
}

export function decrementProduct(productId: string) {
  const lines = getCartLines()
    .map((line) => (line.productId === productId ? { ...line, quantity: line.quantity - 1 } : line))
    .filter((line) => line.quantity > 0);
  setCartLines(lines);
}

export function removeProduct(productId: string) {
  setCartLines(getCartLines().filter((line) => line.productId !== productId));
}

export function getCartSnapshot() {
  const lines = getCartLines()
    .map((line) => {
      const product = dynamicProducts.get(line.productId);
      if (!product) return null;
      return { product, quantity: line.quantity };
    })
    .filter(Boolean) as Array<{ product: DemoPharmacyProduct; quantity: number }>;

  const mrp = lines.reduce((sum, line) => sum + line.product.mrp * line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    mrp,
    total: Number(total.toFixed(2)),
    saved: Number((mrp - total).toFixed(2)),
  };
}

export const mobileStoreKeys = {
  cart: CART_KEY,
};
