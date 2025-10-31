import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface User {
  id: string
  name: string
  email: string
  role: "ADMIN" | "STUDENT"
  schoolId: string
}

interface AuthStore {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      login: async (email: string, password: string) => {
        // Simulated login - in real app, this calls backend API
        const mockUsers: Record<string, { password: string; user: User; token: string }> = {
          "admin@escola.com": {
            password: "admin123",
            user: {
              id: "admin-1",
              name: "Mônica Alves",
              email: "admin@escola.com",
              role: "ADMIN",
              schoolId: "school-1",
            },
            token: "token-admin-123",
          },
          "aluno@escola.com": {
            password: "aluno123",
            user: {
              id: "student-1",
              name: "Lucas Martins",
              email: "aluno@escola.com",
              role: "STUDENT",
              schoolId: "school-1",
            },
            token: "token-student-123",
          },
        }

        const userRecord = mockUsers[email]
        if (!userRecord || userRecord.password !== password) {
          throw new Error("Credenciais inválidas.")
        }

        set({
          isAuthenticated: true,
          user: userRecord.user,
          token: userRecord.token,
        })
      },
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        })
      },
    }),
    {
      name: "auth-store",
    },
  ),
)
