import { ProductCatalogItem } from "../types";

export interface DictionaryEntry {
  name: string;
  emoji: string;
  category: string;
  keywords: string[];
}

export interface CategoryItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  i18nKey: string;
}

export const CATEGORIES: CategoryItem[] = [
  { id: "Lácteos", name: "Lácteos & Huevos", emoji: "🥛", color: "#38bdf8", i18nKey: "categories.dairy" },
  { id: "Frutas y Verduras", name: "Frutas & Verduras", emoji: "🍎", color: "#10b981", i18nKey: "categories.produce" },
  { id: "Panadería", name: "Panadería & Dulces", emoji: "🥖", color: "#f59e0b", i18nKey: "categories.bakery" },
  { id: "Carnes y Pescados", name: "Carnes & Pescados", emoji: "🥩", color: "#f43f5e", i18nKey: "categories.meatFish" },
  { id: "Despensa", name: "Despensa & Pasta", emoji: "🍚", color: "#8b5cf6", i18nKey: "categories.pantry" },
  { id: "Bebidas", name: "Bebidas", emoji: "🧃", color: "#06b6d4", i18nKey: "categories.drinks" },
  { id: "Limpieza", name: "Limpieza & Hogar", emoji: "🧼", color: "#64748b", i18nKey: "categories.cleaning" },
  { id: "Higiene", name: "Higiene Personal", emoji: "🧴", color: "#ec4899", i18nKey: "categories.hygiene" },
  { id: "General", name: "General", emoji: "🛒", color: "#94a3b8", i18nKey: "categories.general" },
];

export const BUILTIN_DICTIONARY: DictionaryEntry[] = [
  // LÁCTEOS & HUEVOS
  { name: "Leche", emoji: "🥛", category: "Lácteos", keywords: ["leche", "desnatada", "semidesnatada", "entera", "lactosa", "avena", "soja", "milk", "whole milk", "skimmed milk", "oat milk", "soy milk"] },
  { name: "Yogur", emoji: "🥣", category: "Lácteos", keywords: ["yogur", "yogurt", "yogures", "griego", "danone", "actimel", "kéfir", "kefir", "yoghurt", "greek yogurt"] },
  { name: "Queso", emoji: "🧀", category: "Lácteos", keywords: ["queso", "mozzarella", "parmesano", "gouda", "cheddar", "brie", "feta", "rallado", "cheese", "parmesan"] },
  { name: "Mantequilla", emoji: "🧈", category: "Lácteos", keywords: ["mantequilla", "margarina", "butter", "margarine"] },
  { name: "Nata", emoji: "🥛", category: "Lácteos", keywords: ["nata", "cocinar", "montar", "cream", "whipping cream", "sour cream"] },
  { name: "Huevos", emoji: "🥚", category: "Lácteos", keywords: ["huevo", "huevos", "camperos", "claras", "egg", "eggs"] },

  // FRUTAS Y VERDURAS
  { name: "Manzanas", emoji: "🍎", category: "Frutas y Verduras", keywords: ["manzana", "manzanas", "fuji", "golden", "reineta", "apple", "apples"] },
  { name: "Plátanos", emoji: "🍌", category: "Frutas y Verduras", keywords: ["platano", "plátano", "platanos", "plátanos", "banana", "canarias", "bananas"] },
  { name: "Tomates", emoji: "🍅", category: "Frutas y Verduras", keywords: ["tomate", "tomates", "cherry", "ensalada", "pera", "tomato", "tomatoes"] },
  { name: "Cebollas", emoji: "🧅", category: "Frutas y Verduras", keywords: ["cebolla", "cebollas", "morada", "dulce", "chalota", "onion", "onions"] },
  { name: "Patatas", emoji: "🥔", category: "Frutas y Verduras", keywords: ["patata", "patatas", "papa", "papas", "potato", "potatoes"] },
  { name: "Lechuga", emoji: "🥬", category: "Frutas y Verduras", keywords: ["lechuga", "ensalada", "iceberg", "canónigos", "canonigos", "rúcula", "rucula", "espinacas", "lettuce", "salad", "spinach"] },
  { name: "Zanahorias", emoji: "🥕", category: "Frutas y Verduras", keywords: ["zanahoria", "zanahorias", "carrot", "carrots"] },
  { name: "Ajo", emoji: "🧄", category: "Frutas y Verduras", keywords: ["ajo", "ajos", "garlic"] },
  { name: "Naranjas", emoji: "🍊", category: "Frutas y Verduras", keywords: ["naranja", "naranjas", "mandarina", "mandarinas", "orange", "oranges", "tangerine"] },
  { name: "Limones", emoji: "🍋", category: "Frutas y Verduras", keywords: ["limon", "limón", "limones", "lemon", "lemons", "lime"] },
  { name: "Aguacate", emoji: "🥑", category: "Frutas y Verduras", keywords: ["aguacate", "aguacates", "guacamole", "avocado", "avocados"] },
  { name: "Fresas", emoji: "🍓", category: "Frutas y Verduras", keywords: ["fresa", "fresas", "fresón", "fresones", "strawberry", "strawberries", "berries"] },
  { name: "Uvas", emoji: "🍇", category: "Frutas y Verduras", keywords: ["uva", "uvas", "grape", "grapes"] },
  { name: "Pimientos", emoji: "🫑", category: "Frutas y Verduras", keywords: ["pimiento", "pimientos", "rojo", "verde", "padron", "padrón", "pepper", "peppers", "bell pepper"] },
  { name: "Calabacín", emoji: "🥒", category: "Frutas y Verduras", keywords: ["calabacin", "calabacín", "pepino", "pepinos", "zucchini", "cucumber"] },
  { name: "Champiñones", emoji: "🍄", category: "Frutas y Verduras", keywords: ["champinon", "champiñón", "champiñones", "setas", "mushroom", "mushrooms"] },
  { name: "Sandía", emoji: "🍉", category: "Frutas y Verduras", keywords: ["sandia", "sandía", "melon", "melón", "watermelon", "melon"] },

  // PANADERÍA & DULCES
  { name: "Pan", emoji: "🥖", category: "Panadería", keywords: ["pan", "barra", "baguette", "molde", "hogaza", "integral", "chapatas", "bread", "loaf", "baguette"] },
  { name: "Tostadas", emoji: "🍞", category: "Panadería", keywords: ["tostadas", "biscotes", "crackers", "picos", "toast", "toast bread", "rusks"] },
  { name: "Galletas", emoji: "🍪", category: "Panadería", keywords: ["galleta", "galletas", "cookies", "maria", "maría", "oreo", "cookie", "biscuits"] },
  { name: "Croissant / Bollería", emoji: "🥐", category: "Panadería", keywords: ["croissant", "bollo", "bollos", "magdalena", "magdalenas", "donut", "donuts", "croissants", "pastry", "muffin", "muffins"] },
  { name: "Chocolate", emoji: "🍫", category: "Panadería", keywords: ["chocolate", "cacao", "nutella", "nocilla", "bombones", "cocoa", "dark chocolate"] },

  // CARNES Y PESCADOS
  { name: "Pollo", emoji: "🍗", category: "Carnes y Pescados", keywords: ["pollo", "pechuga", "muslos", "alitas", "nuggets", "chicken", "wings", "breast"] },
  { name: "Carne picada", emoji: "🥩", category: "Carnes y Pescados", keywords: ["carne picada", "hamburguesa", "hamburguesas", "picada", "minced meat", "ground beef", "burger"] },
  { name: "Ternera", emoji: "🥩", category: "Carnes y Pescados", keywords: ["ternera", "filete", "filetes", "entrecot", "solomillo", "beef", "steak", "veal"] },
  { name: "Cerdo / Chuletas", emoji: "🍖", category: "Carnes y Pescados", keywords: ["cerdo", "lomo", "chuleta", "chuletas", "costillas", "pork", "chops", "ribs"] },
  { name: "Jamón", emoji: "🥓", category: "Carnes y Pescados", keywords: ["jamon", "jamón", "serrano", "iberico", "ibérico", "york", "cocido", "bacon", "beicon", "ham", "bacon"] },
  { name: "Salchichas", emoji: "🌭", category: "Carnes y Pescados", keywords: ["salchicha", "salchichas", "frankfurt", "sausage", "sausages", "hot dog"] },
  { name: "Atún", emoji: "🐟", category: "Carnes y Pescados", keywords: ["atun", "atún", "bonito", "latas", "tuna", "canned tuna"] },
  { name: "Salmón", emoji: "🐟", category: "Carnes y Pescados", keywords: ["salmon", "salmón", "ahumado", "smoked salmon"] },
  { name: "Pescado fresco", emoji: "🐟", category: "Carnes y Pescados", keywords: ["pescado", "merluza", "dorada", "lubina", "bacalao", "fish", "cod", "sea bass"] },
  { name: "Gambas / Mariscos", emoji: "🦐", category: "Carnes y Pescados", keywords: ["gamba", "gambas", "langostinos", "marisco", "mejillones", "shrimp", "prawns", "seafood", "mussels"] },

  // DESPENSA & PASTA
  { name: "Arroz", emoji: "🍚", category: "Despensa", keywords: ["arroz", "bomba", "basmati", "redondo", "rice"] },
  { name: "Pasta", emoji: "🍝", category: "Despensa", keywords: ["pasta", "espagueti", "espaguetis", "macarrones", "fideos", "lasaña", "ravioli", "spaghetti", "macaroni", "noodles"] },
  { name: "Aceite de oliva", emoji: "🫒", category: "Despensa", keywords: ["aceite", "oliva", "virgen", "girasol", "olive oil", "oil", "sunflower oil"] },
  { name: "Sal", emoji: "🧂", category: "Despensa", keywords: ["sal", "salero", "salt"] },
  { name: "Azúcar", emoji: "🧂", category: "Despensa", keywords: ["azucar", "azúcar", "moreno", "sacarina", "sugar", "sweetener"] },
  { name: "Café", emoji: "☕", category: "Despensa", keywords: ["cafe", "café", "grano", "molido", "capsulas", "cápsulas", "nespresso", "coffee", "espresso"] },
  { name: "Té / Infusión", emoji: "🍵", category: "Despensa", keywords: ["te", "té", "infusion", "infusión", "manzanilla", "poleo", "tea", "chamomile"] },
  { name: "Cereales", emoji: "🥣", category: "Despensa", keywords: ["cereales", "muesli", "avena", "cornflakes", "cereal", "oats", "oatmeal"] },
  { name: "Harina", emoji: "🌾", category: "Despensa", keywords: ["harina", "trigo", "repostería", "flour", "wheat flour"] },
  { name: "Tomate frito", emoji: "🥫", category: "Despensa", keywords: ["tomate frito", "triturado", "salsa", "tomato sauce", "crushed tomato"] },
  { name: "Legumbres", emoji: "🫘", category: "Despensa", keywords: ["lentejas", "garbanzos", "alubias", "judias", "judías", "beans", "lentils", "chickpeas"] },

  // BEBIDAS
  { name: "Agua", emoji: "💧", category: "Bebidas", keywords: ["agua", "botella", "garrafa", "mineral", "water", "sparkling water"] },
  { name: "Zumo", emoji: "🧃", category: "Bebidas", keywords: ["zumo", "jugo", "naranja", "piña", "melocoton", "juice", "orange juice"] },
  { name: "Cerveza", emoji: "🍺", category: "Bebidas", keywords: ["cerveza", "cervezas", "mahou", "estrella", "heineken", "beer", "beers", "ipa"] },
  { name: "Vino", emoji: "🍷", category: "Bebidas", keywords: ["vino", "tinto", "blanco", "rioja", "ribera", "wine", "red wine", "white wine"] },
  { name: "Refresco", emoji: "🥤", category: "Bebidas", keywords: ["refresco", "coca cola", "cocacola", "fanta", "sprite", "tonica", "pepsi", "soda", "coke"] },

  // LIMPIEZA & HOGAR
  { name: "Papel higiénico", emoji: "🧻", category: "Limpieza", keywords: ["papel higienico", "papel higiénico", "higienico", "rollos", "toilet paper", "tissue"] },
  { name: "Papel de cocina", emoji: "🧻", category: "Limpieza", keywords: ["papel cocina", "servilletas", "kleenex", "pañuelos", "paper towels", "napkins"] },
  { name: "Detergente lavadora", emoji: "🧼", category: "Limpieza", keywords: ["detergente", "ariel", "skip", "lavadora", "capsulas lavadora", "detergent", "laundry"] },
  { name: "Suavizante", emoji: "🌸", category: "Limpieza", keywords: ["suavizante", "mimosin", "flor", "fabric softener"] },
  { name: "Lavavajillas", emoji: "🫧", category: "Limpieza", keywords: ["fairy", "lavavajillas", "lavaplatos", "pastillas lavavajillas", "finish", "dishwasher", "dish soap"] },
  { name: "Fregasuelos / Limpiador", emoji: "🧹", category: "Limpieza", keywords: ["fregasuelos", "fregona", "limpiacristales", "multiusos", "bayeta", "bayetas", "estropajo", "floor cleaner", "sponge", "cleaner"] },
  { name: "Lejía", emoji: "🧴", category: "Limpieza", keywords: ["lejia", "lejía", "desinfectante", "bleach", "disinfectant"] },
  { name: "Bolsas de basura", emoji: "🗑️", category: "Limpieza", keywords: ["bolsas basura", "basura", "cubo", "trash bags", "garbage bags"] },
  { name: "Papel aluminio / Film", emoji: "🌯", category: "Limpieza", keywords: ["albal", "aluminio", "papel horno", "film", "aluminum foil", "plastic wrap"] },

  // HIGIENE PERSONAL
  { name: "Champú", emoji: "🧴", category: "Higiene", keywords: ["champu", "champú", "acondicionador", "mascarilla", "shampoo", "conditioner"] },
  { name: "Gel de ducha", emoji: "🧼", category: "Higiene", keywords: ["gel", "ducha", "jabon", "jabón", "shower gel", "body wash", "soap"] },
  { name: "Pasta de dientes", emoji: "🪥", category: "Higiene", keywords: ["pasta dientes", "dentifrico", "colgate", "cepillo", "toothpaste", "toothbrush"] },
  { name: "Desodorante", emoji: "✨", category: "Higiene", keywords: ["desodorante", "spray", "roll-on", "deodorant"] },
];

/**
 * Normalizes text for matching (lowercase, strips accents)
 */
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Smart product matching algorithm:
 * 1. Checks user's custom catalog (from the vault)
 * 2. Checks built-in grocery dictionary
 * 3. Matches exact words or keyword tokens
 */
export function matchProduct(
  input: string,
  customCatalog: ProductCatalogItem[] = []
): { emoji: string; category: string; matchedName?: string } {
  const norm = normalizeText(input);
  if (!norm) {
    return { emoji: "🛒", category: "General" };
  }

  // 1. Check custom catalog first
  for (const item of customCatalog) {
    const itemNorm = normalizeText(item.name);
    if (norm === itemNorm || norm.includes(itemNorm) || itemNorm.includes(norm)) {
      return { emoji: item.emoji, category: item.category, matchedName: item.name };
    }
    for (const kw of item.keywords || []) {
      const kwNorm = normalizeText(kw);
      if (kwNorm && norm.includes(kwNorm)) {
        return { emoji: item.emoji, category: item.category, matchedName: item.name };
      }
    }
  }

  // 2. Check built-in dictionary
  const words = norm.split(/\s+/);

  // Exact or contains name match
  for (const entry of BUILTIN_DICTIONARY) {
    const entryNorm = normalizeText(entry.name);
    if (norm === entryNorm || norm.includes(entryNorm)) {
      return { emoji: entry.emoji, category: entry.category, matchedName: entry.name };
    }
  }

  // Keyword match
  for (const entry of BUILTIN_DICTIONARY) {
    for (const kw of entry.keywords) {
      const kwNorm = normalizeText(kw);
      if (words.some((w) => w === kwNorm || w.startsWith(kwNorm))) {
        return { emoji: entry.emoji, category: entry.category, matchedName: entry.name };
      }
    }
  }

  // Substring match on keywords
  for (const entry of BUILTIN_DICTIONARY) {
    for (const kw of entry.keywords) {
      const kwNorm = normalizeText(kw);
      if (norm.includes(kwNorm)) {
        return { emoji: entry.emoji, category: entry.category, matchedName: entry.name };
      }
    }
  }

  // Fallback
  return { emoji: "🛒", category: "General" };
}

/**
 * Returns the localized label for a category ID or category name
 */
export function getCategoryLabel(
  categoryIdOrName: string | undefined | null,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (!categoryIdOrName) return "";

  const found = CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === categoryIdOrName.toLowerCase() ||
      c.name.toLowerCase() === categoryIdOrName.toLowerCase()
  );
  if (found) {
    const translated = t(found.i18nKey);
    return translated && translated !== found.i18nKey ? translated : found.name;
  }

  // Cross-language and substring variations for legacy data
  const norm = normalizeText(categoryIdOrName);
  if (norm.includes("lact") || norm.includes("dair") || norm.includes("egg")) return t("categories.dairy") || "Lácteos & Huevos";
  if (norm.includes("frut") || norm.includes("verdur") || norm.includes("produce") || norm.includes("fruit") || norm.includes("vegetab")) return t("categories.produce") || "Frutas & Verduras";
  if (norm.includes("pan") || norm.includes("baker") || norm.includes("dulc") || norm.includes("sweet")) return t("categories.bakery") || "Panadería & Dulces";
  if (norm.includes("carn") || norm.includes("pesca") || norm.includes("meat") || norm.includes("fish") || norm.includes("seafood")) return t("categories.meatFish") || "Carnes & Pescados";
  if (norm.includes("despens") || norm.includes("pantr") || norm.includes("past") || norm.includes("staple")) return t("categories.pantry") || "Despensa & Pasta";
  if (norm.includes("bebid") || norm.includes("drink") || norm.includes("beverag")) return t("categories.drinks") || "Bebidas";
  if (norm.includes("limpie") || norm.includes("clean") || norm.includes("hoga") || norm.includes("house")) return t("categories.cleaning") || "Limpieza & Hogar";
  if (norm.includes("higien") || norm.includes("hygiene") || norm.includes("person")) return t("categories.hygiene") || "Higiene Personal";
  if (norm.includes("gener")) return t("categories.general") || "General";

  return categoryIdOrName;
}

