"use client";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export function MoreLogout() {
  return (
    <Card className="py-1">
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-4 py-3.5 text-left font-semibold text-bad">
        <Icon name="logout" />Log out
      </button>
    </Card>
  );
}
