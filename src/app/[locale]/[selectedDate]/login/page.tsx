"use client";

import LoginForm from "@/components/login";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <LoginForm redirect="/profile" />
    </div>
  );
}
