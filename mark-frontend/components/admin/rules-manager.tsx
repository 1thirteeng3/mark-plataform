"use client"

import type React from "react"

import { useState } from "react"
import { useDataStore } from "@/lib/store/data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"

export function RulesManager() {
  const { rules, createRule } = useDataStore()
  const [ruleName, setRuleName] = useState("")
  const [marksToAward, setMarksToAward] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleName || !marksToAward) return

    setIsLoading(true)
    try {
      createRule(ruleName, Number.parseInt(marksToAward))
      setRuleName("")
      setMarksToAward("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Rule Form */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Criar Nova Conquista</h2>
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Conquista</label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Ex: Participação em Aula"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marks a Conceder</label>
              <Input
                type="number"
                value={marksToAward}
                onChange={(e) => setMarksToAward(e.target.value)}
                placeholder="Ex: 100"
                disabled={isLoading}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isLoading || !ruleName || !marksToAward}
            className="gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            Criar Conquista
          </Button>
        </form>
      </Card>

      {/* Rules List */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Conquistas Ativas</h2>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{rule.ruleName}</h3>
                <p className="text-sm text-gray-600">
                  {rule.marksToAward} Marks • Criada em {new Date(rule.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Ativa</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
