import { redirect } from "next/navigation"

export default function Home() {
  // O BI é um app estático autocontido servido a partir de /public.
  redirect("/eficacia-entrega.html")
}
