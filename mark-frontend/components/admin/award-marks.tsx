"use client"

import { useState } from "react"
import { useDataStore } from "@/lib/store/data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Award, CheckCircle } from "lucide-react"

export function AwardMarks() {
  const { students, rules, awardMarks } = useDataStore()
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedRule, setSelectedRule] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const studentList = Object.values(students)
  const selectedRuleData = rules.find((r) => r.id === selectedRule)

  const handleAward = async () => {
    if (!selectedStudent || !selectedRule) return

    setIsLoading(true)
    try {
      awardMarks(selectedStudent, selectedRule)
      setSuccessMessage(`${selectedRuleData?.marksToAward} Marks concedidos com sucesso!`)
      setTimeout(() => setSuccessMessage(""), 3000)
      setSelectedStudent("")
      setSelectedRule("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Premiar Alunos</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Aluno</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Escolha um aluno --</option>
              {studentList.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.marksBalance} Marks)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione a Conquista</label>
            <select
              value={selectedRule}
              onChange={(e) => setSelectedRule(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Escolha uma conquista --</option>
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.ruleName} (+{rule.marksToAward} Marks)
                </option>
              ))}
            </select>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>{successMessage}</span>
            </div>
          )}

          <Button
            onClick={handleAward}
            disabled={isLoading || !selectedStudent || !selectedRule}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Award className="w-4 h-4" />
            Conceder Premiação
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {selectedStudent && selectedRule && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-3">Resumo da Premiação</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Aluno:</strong> {studentList.find((s) => s.id === selectedStudent)?.name}
            </p>
            <p>
              <strong>Conquista:</strong> {selectedRuleData?.ruleName}
            </p>
            <p>
              <strong>Marks a Conceder:</strong> +{selectedRuleData?.marksToAward}
            </p>
            <p>
              <strong>Novo Saldo:</strong>{" "}
              {(studentList.find((s) => s.id === selectedStudent)?.marksBalance || 0) +
                (selectedRuleData?.marksToAward || 0)}{" "}
              Marks
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
