import Link from "next/link";

export function UpgradeButton() {
  return (
    <Link
      href="/planes"
      className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-700"
    >
      Mejorar plan
    </Link>
  );
}