import { ProductCatalogItem } from "../types";

export interface DictionaryEntry {
  name: string;
  emoji: string;
  category: string;
  keywords: string[];
}

export const CATEGORIES = [
  { id: "Lácteos", name: "Lácteos & Huevos", emoji: "🥛", color: "#38bdf8" },
  { id: "Frutas y Verduras", name: "Frutas & Verduras", emoji: "🍎", color: "#10b981" },
  { id: "Panadería", name: "Panadería & Dulces", emoji: "🥖", color: "#f59e0b" },
  { id: "Carnes y Pescados", name: "Carnes & Pescados", emoji: "🥩", color: "#f43f5e" },
  { id: "Despensa", name: "Despensa & Pasta", emoji: "🍚", color: "#8b5cf6" },
  { id: "Bebidas", name: "Bebidas", emoji: "🧃", color: "#06b6d4" },
  { id: "Limpieza", name: "Limpieza & Hogar", emoji: "🧼", color: "#64748b" },
  { id: "Higiene", name: "Higiene Personal", emoji: "🧴", color: "#ec4899" },
  { id: "General", name: "General", emoji: "🛒", color: "#94a3b8" },
];

export const BUILTIN_DICTIONARY: DictionaryEntry[] = [
  // LÁCTEOS & HUEVOS
  { name: "Leche", emoji: "🥛", category: "Lácteos", keywords: ["leche", "desnatada", "semidesnatada", "entera", "lactosa", "avena", "soja"] },
  { name: "Yogur", emoji: "🥣", category: "Lácteos", keywords: ["yogur", "yogurt", "yogures", "griego", "danone", "actimel", "kéfir", "kefir"] },
  { name: "Queso", emoji: "🧀", category: "Lácteos", keywords: ["queso", "mozzarella", "parmesano", "gouda", "cheddar", "brie", "feta", "rallado"] },
  { name: "Mantequilla", emoji: "🧈", category: "Lácteos", keywords: ["mantequilla", "margarina"] },
  { name: "Nata", emoji: "🥛", category: "Lácteos", keywords: ["nata", "cocinar", "montar"] },
  { name: "Huevos", emoji: "🥚", category: "Lácteos", keywords: ["huevo", "huevos", "camperos", "claras"] },

  // FRUTAS Y VERDURAS
  { name: "Manzanas", emoji: "🍎", category: "Frutas y Verduras", keywords: ["manzana", "manzanas", "fuji", "golden", "reineta"] },
  { name: "Plátanos", emoji: "🍌", category: "Frutas y Verduras", keywords: ["platano", "plátano", "platanos", "plátanos", "banana", "canarias"] },
  { name: "Tomates", emoji: "🍅", category: "Frutas y Verduras", keywords: ["tomate", "tomates", "cherry", "ensalada", "pera"] },
  { name: "Cebollas", emoji: "🧅", category: "Frutas y Verduras", keywords: ["cebolla", "cebollas", "morada", "dulce", "chalota"] },
  { name: "Patatas", emoji: "🥔", category: "Frutas y Verduras", keywords: ["patata", "patatas", "papa", "papas"] },
  { name: "Lechuga", emoji: "🥬", category: "Frutas y Verduras", keywords: ["lechuga", "ensalada", "iceberg", "canónigos", "canonigos", "rúcula", "rucula", "espinacas"] },
  { name: "Zanahorias", emoji: "🥕", category: "Frutas y Verduras", keywords: ["zanahoria", "zanahorias"] },
  { name: "Ajo", emoji: "🧄", category: "Frutas y Verduras", keywords: ["ajo", "ajos"] },
  { name: "Naranjas", emoji: "🍊", category: "Frutas y Verduras", keywords: ["naranja", "naranjas", "mandarina", "mandarinas"] },
  { name: "Limones", emoji: "🍋", category: "Frutas y Verduras", keywords: ["limon", "limón", "limones"] },
  { name: "Aguacate", emoji: "🥑", category: "Frutas y Verduras", keywords: ["aguacate", "aguacates", "guacamole"] },
  { name: "Fresas", emoji: "🍓", category: "Frutas y Verduras", keywords: ["fresa", "fresas", "fresón", "fresones"] },
  { name: "Uvas", emoji: "🍇", category: "Frutas y Verduras", keywords: ["uva", "uvas"] },
  { name: "Pimientos", emoji: "🫑", category: "Frutas y Verduras", keywords: ["pimiento", "pimientos", "rojo", "verde", "padron", "padrón"] },
  { name: "Calabacín", emoji: "🥒", category: "Frutas y Verduras", keywords: ["calabacin", "calabacín", "pepino", "pepinos"] },
  { name: "Champiñones", emoji: "🍄", category: "Frutas y Verduras", keywords: ["champinon", "champiñón", "champiñones", "setas"] },
  { name: "Sandía", emoji: "🍉", category: "Frutas y Verduras", keywords: ["sandia", "sandía", "melon", "melón"] },

  // PANADERÍA & DULCES
  { name: "Pan", emoji: "🥖", category: "Panadería", keywords: ["pan", "barra", "baguette", "molde", "hogaza", "integral", "chapatas"] },
  { name: "Tostadas", emoji: "🍞", category: "Panadería", keywords: ["tostadas", "biscotes", "crackers", "picos"] },
  { name: "Galletas", emoji: "🍪", category: "Panadería", keywords: ["galleta", "galletas", "cookies", "maria", "maría", "oreo"] },
  { name: "Croissant / Bollería", emoji: "🥐", category: "Panadería", keywords: ["croissant", "bollo", "bollos", "magdalena", "magdalenas", "donut", "donuts", "croissants"] },
  { name: "Chocolate", emoji: "🍫", category: "Panadería", keywords: ["chocolate", "cacao", "nutella", "nocilla", "bombones"] },

  // CARNES Y PESCADOS
  { name: "Pollo", emoji: "🍗", category: "Carnes y Pescados", keywords: ["pollo", "pechuga", "muslos", "alitas", "nuggets"] },
  { name: "Carne picada", emoji: "🥩", category: "Carnes y Pescados", keywords: ["carne picada", "hamburguesa", "hamburguesas", "picada"] },
  { name: "Ternera", emoji: "🥩", category: "Carnes y Pescados", keywords: ["ternera", "filete", "filetes", "entrecot", "solomillo"] },
  { name: "Cerdo / Chuletas", emoji: "🍖", category: "Carnes y Pescados", keywords: ["cerdo", "lomo", "chuleta", "chuletas", "costillas"] },
  { name: "Jamón", emoji: "🥓", category: "Carnes y Pescados", keywords: ["jamon", "jamón", "serrano", "iberico", "ibérico", "york", "cocido", "bacon", "beicon"] },
  { name: "Salchichas", emoji: "🌭", category: "Carnes y Pescados", keywords: ["salchicha", "salchichas", "frankfurt"] },
  { name: "Atún", emoji: "🐟", category: "Carnes y Pescados", keywords: ["atun", "atún", "bonito", "latas"] },
  { name: "Salmón", emoji: "🐟", category: "Carnes y Pescados", keywords: ["salmon", "salmón", "ahumado"] },
  { name: "Pescado fresco", emoji: "🐟", category: "Carnes y Pescados", keywords: ["pescado", "merluza", "dorada", "lubina", "bacalao"] },
  { name: "Gambas / Mariscos", emoji: "🦐", category: "Carnes y Pescados", keywords: ["gamba", "gambas", "langostinos", "marisco", "mejillones"] },

  // DESPENSA & PASTA
  { name: "Arroz", emoji: "🍚", category: "Despensa", keywords: ["arroz", "bomba", "basmati", "redondo"] },
  { name: "Pasta", emoji: "🍝", category: "Despensa", keywords: ["pasta", "espagueti", "espaguetis", "macarrones", "fideos", "lasaña", "ravioli"] },
  { name: "Aceite de oliva", emoji: "🫒", category: "Despensa", keywords: ["aceite", "oliva", "virgen", "girasol"] },
  { name: "Sal", emoji: "🧂", category: "Despensa", keywords: ["sal", "salero"] },
  { name: "Azúcar", emoji: "🧂", category: "Despensa", keywords: ["azucar", "azúcar", "moreno", "sacarina"] },
  { name: "Café", emoji: "☕", category: "Despensa", keywords: ["cafe", "café", "grano", "molido", "capsulas", "cápsulas", "nespresso"] },
  { name: "Té / Infusión", emoji: "🍵", category: "Despensa", keywords: ["te", "té", "infusion", "infusión", "manzanilla", "poleo"] },
  { name: "Cereales", emoji: "🥣", category: "Despensa", keywords: ["cereales", "muesli", "avena", "cornflakes"] },
  { name: "Harina", emoji: "🌾", category: "Despensa", keywords: ["harina", "trigo", "repostería"] },
  { name: "Tomate frito", emoji: "🥫", category: "Despensa", keywords: ["tomate frito", "triturado", "salsa"] },
  { name: "Legumbres", emoji: "🫘", category: "Despensa", keywords: ["lentejas", "garbanzos", "alubias", "judias", "judías"] },

  // BEBIDAS
  { name: "Agua", emoji: "💧", category: "Bebidas", keywords: ["agua", "botella", "garrafa", "mineral"] },
  { name: "Zumo", emoji: "🧃", category: "Bebidas", keywords: ["zumo", "jugo", "naranja", "piña", "melocoton"] },
  { name: "Cerveza", emoji: "🍺", category: "Bebidas", keywords: ["cerveza", "cervezas", "mahou", "estrella", "heineken"] },
  { name: "Vino", emoji: "🍷", category: "Bebidas", keywords: ["vino", "tinto", "blanco", "rioja", "ribera"] },
  { name: "Refresco", emoji: "🥤", category: "Bebidas", keywords: ["refresco", "coca cola", "cocacola", "fanta", "sprite", "tonica", "pepsi"] },

  // LIMPIEZA & HOGAR
  { name: "Papel higiénico", emoji: "🧻", category: "Limpieza", keywords: ["papel higienico", "papel higiénico", "higienico", "rollos"] },
  { name: "Papel de cocina", emoji: "🧻", category: "Limpieza", keywords: ["papel cocina", "servilletas", "kleenex", "pañuelos"] },
  { name: "Detergente lavadora", emoji: "🧼", category: "Limpieza", keywords: ["detergente", "ariel", "skip", "lavadora", "capsulas lavadora"] },
  { name: "Suavizante", emoji: "🌸", category: "Limpieza", keywords: ["suavizante", "mimosin", "flor"] },
  { name: "Lavavajillas", emoji: "🫧", category: "Limpieza", keywords: ["fairy", "lavavajillas", "lavaplatos", "pastillas lavavajillas", "finish"] },
  { name: "Fregasuelos / Limpiador", emoji: "🧹", category: "Limpieza", keywords: ["fregasuelos", "fregona", "limpiacristales", "multiusos", "bayeta", "bayetas", "estropajo"] },
  { name: "Lejía", emoji: "🧴", category: "Limpieza", keywords: ["lejia", "lejía", "desinfectante"] },
  { name: "Bolsas de basura", emoji: "🗑️", category: "Limpieza", keywords: ["bolsas basura", "basura", "cubo"] },
  { name: "Papel aluminio / Film", emoji: "🌯", category: "Limpieza", keywords: ["albal", "aluminio", "papel horno", "film"] },

  // HIGIENE PERSONAL
  { name: "Champú", emoji: "🧴", category: "Higiene", keywords: ["champu", "champú", "acondicionador", "mascarilla"] },
  { name: "Gel de ducha", emoji: "🧼", category: "Higiene", keywords: ["gel", "ducha", "jabon", "jabón"] },
  { name: "Pasta de dientes", emoji: "🪥", category: "Higiene", keywords: ["pasta dientes", "dentifrico", "colgate", "cepillo"] },
  { name: "Desodorante", emoji: "✨", category: "Higiene", keywords: ["desodorante", "spray", "roll-on"] },
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
