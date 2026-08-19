import { readFileSync } from "fs";
import { join } from "path";
import type { VlogMeta } from "@/lib/types";
import VlogView from "./VlogView";

export const dynamicParams = false;

export function generateStaticParams() {
  const raw = readFileSync(join(process.cwd(), "public/data/vlogs/index.json"), "utf-8");
  const metas = JSON.parse(raw) as VlogMeta[];
  return metas.map((m) => ({ id: m.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VlogView id={id} />;
}
