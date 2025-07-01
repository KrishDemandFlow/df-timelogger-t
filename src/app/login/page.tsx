'use client'

import LoginForm from "@/components/auth/LoginForm";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.replace('/');
  };

  return (
    <div className="bg-gray-50 flex flex-col justify-center">
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
} 