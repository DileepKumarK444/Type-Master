import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function Page() {
  return <main id="main" tabIndex={-1} className="grid min-h-screen place-items-center px-4 py-10 outline-none"><ForgotForm /></main>;
}
