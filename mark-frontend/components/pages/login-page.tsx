"use client"

import type React from "react"

import { useState } from "react"
import { useAuthStore } from "@/lib/store/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Image from "next/image"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="mt-6 p-4 rounded-lg text-sm text-gray-700 bg-white">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/design-mode/MARK%20Logo%20%285%29.png"
            alt="Mark Logo"
            width={80}
            height={80}
            className="w-20 h-20"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">Mark</h1>
          <p className="text-gray-600">Plataforma de Gamificação Educacional</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700">
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-orange-50 rounded-lg text-sm text-orange-200">
          <p className="font-semibold text-orange-700 mb-2">Credenciais de Teste:</p>
          <p>
            <strong>Admin:</strong> admin@escola.com / admin123
          </p>
          <p>
            <strong>Aluno:</strong> aluno@escola.com / aluno123
          </p>
        </div>
      </Card>
    </div>
  )
}
