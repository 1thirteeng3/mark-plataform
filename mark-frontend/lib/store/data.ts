import { create } from "zustand"

export interface SchoolRule {
  id: string
  ruleName: string
  marksToAward: number
  isActive: boolean
  createdAt: string
}

export interface Transaction {
  id: string
  type: "CREDIT" | "DEBIT"
  amount: number
  description: string
  createdAt: string
}

export interface Student {
  id: string
  name: string
  marksBalance: number
  transactions: Transaction[]
}

export interface VoucherCatalogItem {
  id: string
  name: string
  description: string
  marksCost: number
  isAvailable: boolean
}

export interface RedeemedVoucher {
  id: string
  voucherName: string
  voucherCode: string
  costInMarks: number
  status: "PENDING" | "COMPLETED" | "FAILED"
  createdAt: string
}

interface DataStore {
  // Rules
  rules: SchoolRule[]
  createRule: (ruleName: string, marksToAward: number) => void
  getRules: () => SchoolRule[]

  // Students
  students: Record<string, Student>
  getStudent: (studentId: string) => Student | undefined
  awardMarks: (studentId: string, ruleId: string) => void

  // Vouchers
  voucherCatalog: VoucherCatalogItem[]
  getVoucherCatalog: () => VoucherCatalogItem[]
  redeemedVouchers: Record<string, RedeemedVoucher[]>
  redeemVoucher: (studentId: string, voucherId: string) => Promise<string>
  getRedeemedVouchers: (studentId: string) => RedeemedVoucher[]
}

const mockVouchers: VoucherCatalogItem[] = [
  {
    id: "voucher-1",
    name: "Vale iFood R$20",
    description: "Código que você usa no app iFood",
    marksCost: 300,
    isAvailable: true,
  },
  {
    id: "voucher-2",
    name: "Recarga Pré-pago R$15",
    description: "Crédito para celular",
    marksCost: 250,
    isAvailable: true,
  },
  {
    id: "voucher-3",
    name: "Vale Netflix R$30",
    description: "Mês de streaming",
    marksCost: 400,
    isAvailable: true,
  },
  {
    id: "voucher-4",
    name: "Vale Spotify R$15",
    description: "Mês de música",
    marksCost: 200,
    isAvailable: true,
  },
]

export const useDataStore = create<DataStore>((set, get) => ({
  rules: [
    {
      id: "rule-1",
      ruleName: "Participação em Aula",
      marksToAward: 100,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "rule-2",
      ruleName: "Trabalho Destaque",
      marksToAward: 150,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],

  students: {
    "student-1": {
      id: "student-1",
      name: "Lucas Martins",
      marksBalance: 500,
      transactions: [
        {
          id: "tx-1",
          type: "CREDIT",
          amount: 100,
          description: "Crédito por Participação em Aula",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tx-2",
          type: "CREDIT",
          amount: 150,
          description: "Crédito por Trabalho Destaque",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tx-3",
          type: "CREDIT",
          amount: 250,
          description: "Crédito por Participação em Aula",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  },

  voucherCatalog: mockVouchers,
  redeemedVouchers: {},

  createRule: (ruleName: string, marksToAward: number) => {
    const newRule: SchoolRule = {
      id: `rule-${Date.now()}`,
      ruleName,
      marksToAward,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      rules: [...state.rules, newRule],
    }))
  },

  getRules: () => get().rules,

  getStudent: (studentId: string) => get().students[studentId],

  awardMarks: (studentId: string, ruleId: string) => {
    const rule = get().rules.find((r) => r.id === ruleId)
    if (!rule) return

    set((state) => {
      const student = state.students[studentId]
      if (!student) return state

      const newTransaction: Transaction = {
        id: `tx-${Date.now()}`,
        type: "CREDIT",
        amount: rule.marksToAward,
        description: `Crédito por ${rule.ruleName}`,
        createdAt: new Date().toISOString(),
      }

      return {
        students: {
          ...state.students,
          [studentId]: {
            ...student,
            marksBalance: student.marksBalance + rule.marksToAward,
            transactions: [newTransaction, ...student.transactions],
          },
        },
      }
    })
  },

  getVoucherCatalog: () => get().voucherCatalog,

  redeemVoucher: async (studentId: string, voucherId: string) => {
    const student = get().students[studentId]
    const voucher = get().voucherCatalog.find((v) => v.id === voucherId)

    if (!student || !voucher) {
      throw new Error("Aluno ou voucher não encontrado")
    }

    if (student.marksBalance < voucher.marksCost) {
      throw new Error("Saldo insuficiente")
    }

    // Simulated API call to voucher provider
    const voucherCode = `${voucher.id.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const redeemedVoucher: RedeemedVoucher = {
      id: `redeemed-${Date.now()}`,
      voucherName: voucher.name,
      voucherCode,
      costInMarks: voucher.marksCost,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
    }

    set((state) => {
      const updatedStudent = state.students[studentId]
      if (!updatedStudent) return state

      const debitTransaction: Transaction = {
        id: `tx-${Date.now()}`,
        type: "DEBIT",
        amount: voucher.marksCost,
        description: `Débito por resgate de ${voucher.name}`,
        createdAt: new Date().toISOString(),
      }

      return {
        students: {
          ...state.students,
          [studentId]: {
            ...updatedStudent,
            marksBalance: updatedStudent.marksBalance - voucher.marksCost,
            transactions: [debitTransaction, ...updatedStudent.transactions],
          },
        },
        redeemedVouchers: {
          ...state.redeemedVouchers,
          [studentId]: [...(state.redeemedVouchers[studentId] || []), redeemedVoucher],
        },
      }
    })

    return voucherCode
  },

  getRedeemedVouchers: (studentId: string) => get().redeemedVouchers[studentId] || [],
}))
