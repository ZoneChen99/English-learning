import { readFileSync } from "fs";
import { join } from "path";
import type { BookMeta } from "@/lib/types";
import LearnView from "./LearnView";

export const dynamicParams = false;

export function generateStaticParams() {
  const raw = readFileSync(join(process.cwd(), "public/data/books.json"), "utf-8");
  const metas = JSON.parse(raw) as BookMeta[];
  return metas.map((m) => ({ bookId: m.id }));
}

export default async function Page({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  return <LearnView bookId={bookId} />;
}
