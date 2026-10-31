import { NextResponse, type NextRequest } from "next/server";
import { MIN_SEARCH_LENGTH } from "@/lib/shop";
import { catalogCategories, popularSearches, suggestProducts } from "@/server/catalog";

const HEADERS = { "Cache-Control": "public, max-age=30, s-maxage=60" };

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  try {
    if (query.length < MIN_SEARCH_LENGTH) {
      return NextResponse.json({ products: [], categories: [], popular: await popularSearches() }, { headers: HEADERS });
    }
    const [products, categories] = await Promise.all([suggestProducts(query), catalogCategories()]);
    const needle = query.toLowerCase();
    return NextResponse.json(
      { products, categories: categories.filter((category) => category.label.toLowerCase().includes(needle)).slice(0, 3), popular: [] },
      { headers: HEADERS },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ products: [], categories: [], popular: [] });
  }
}
