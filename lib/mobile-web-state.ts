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

export type LocalDoctorBooking = {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  hospital: string;
  fee: number;
  consultationType: string;
  appointmentDate: string;
  appointmentTime: string;
  createdAt: string;
  status: "upcoming" | "completed" | "cancelled";
  paymentStatus: "paid" | "pending";
};

export type LocalPharmacyOrder = {
  id: string;
  createdAt: string;
  status: "placed" | "accepted" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
  paymentMethod: string;
  total: number;
  itemCount: number;
  pharmacyName: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    name: string;
  }>;
};

const CART_KEY = "saiman-web-cart-v1";
const BOOKINGS_KEY = "saiman-web-bookings-v1";
const ORDERS_KEY = "saiman-web-orders-v1";
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
    pharmacyName: "Austy Pharmacy",
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
    pharmacyName: "Austy Pharmacy",
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
    pharmacyName: "Austy Pharmacy",
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
    pharmacyName: "Austy Pharmacy",
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

function nextId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
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

export function getLocalBookings() {
  return readStore<LocalDoctorBooking[]>(BOOKINGS_KEY, []);
}

export function addLocalBooking(
  booking: Omit<LocalDoctorBooking, "id" | "createdAt" | "status" | "paymentStatus"> & {
    status?: LocalDoctorBooking["status"];
    paymentStatus?: LocalDoctorBooking["paymentStatus"];
  },
) {
  const nextBooking: LocalDoctorBooking = {
    id: nextId("booking"),
    createdAt: new Date().toISOString(),
    status: booking.status || "upcoming",
    paymentStatus: booking.paymentStatus || "paid",
    ...booking,
  };

  writeStore(BOOKINGS_KEY, [nextBooking, ...getLocalBookings()]);
  return nextBooking;
}

export function getLocalOrders() {
  return readStore<LocalPharmacyOrder[]>(ORDERS_KEY, []);
}

export function addLocalOrder(order: Omit<LocalPharmacyOrder, "id" | "createdAt" | "status"> & { status?: LocalPharmacyOrder["status"] }) {
  const nextOrder: LocalPharmacyOrder = {
    id: nextId("order"),
    createdAt: new Date().toISOString(),
    status: order.status || "placed",
    ...order,
  };

  writeStore(ORDERS_KEY, [nextOrder, ...getLocalOrders()]);
  return nextOrder;
}

export const mobileStoreKeys = {
  cart: CART_KEY,
  bookings: BOOKINGS_KEY,
  orders: ORDERS_KEY,
};
