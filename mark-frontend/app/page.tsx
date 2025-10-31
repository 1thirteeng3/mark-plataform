"use client"

import { useAuthStore } from "@/lib/store/auth"
import { LoginPage } from "@/components/pages/login-page"
import { AdminDashboard } from "@/components/pages/admin-dashboard"
import { StudentDashboard } from "@/components/pages/student-dashboard"

export default function Home() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (user?.role === "ADMIN") {
    return <AdminDashboard />
  }

  return <StudentDashboard />
}
