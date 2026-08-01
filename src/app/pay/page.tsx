import { Suspense } from "react";
import PayClient from "./PayClient";

export default function PayPage() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem" }}>載入付款…</main>}>
      <PayClient />
    </Suspense>
  );
}
