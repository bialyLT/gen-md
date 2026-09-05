import Link from "next/link";

export function UpgradeButton() {
  return (
    <Link
      href="/planes"
      className="inline-block rounded-lg bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition hover:bg-sky-500"
    >
      Mejorar plan
    </Link>
  );
}