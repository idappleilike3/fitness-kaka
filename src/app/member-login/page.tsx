import { redirect } from "next/navigation";

export default function MemberLoginPage() {
  const liffId = (process.env.NEXT_PUBLIC_LIFF_ID || process.env.LIFF_ID || "").trim();
  if (liffId) redirect(`https://liff.line.me/${liffId}`);
  redirect("/liff");
}
