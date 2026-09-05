"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-sky-200 bg-white px-5 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
    >
      Cerrar sesión
    </button>
  );
}