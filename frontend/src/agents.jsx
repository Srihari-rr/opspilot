import { Brain, BarChart3, PackageSearch, Mail, ShieldCheck, Zap, FileText, Bot } from 'lucide-react'

export const AGENTS = {
  planner:  { name: 'Planner',  role: 'Understands & plans',   icon: Brain,         color: '#7c6a8a' },
  analyst:  { name: 'Analyst',  role: 'Finds the impact',      icon: BarChart3,     color: '#4f7a80' },
  sourcing: { name: 'Sourcing', role: 'Finds new suppliers',   icon: PackageSearch, color: '#b08a3e' },
  comms:    { name: 'Comms',    role: 'Writes to customers',   icon: Mail,          color: '#a8667a' },
  guardian: { name: 'Guardian', role: 'Safety & approvals',    icon: ShieldCheck,   color: '#5f8a6a' },
  executor: { name: 'Executor', role: 'Acts in the systems',   icon: Zap,           color: '#b0683c' },
  reporter: { name: 'Reporter', role: 'Reports the outcome',   icon: FileText,      color: '#5b78a0' },
  system:   { name: 'System',   role: '',                      icon: Bot,           color: '#8d857a' },
}
export const ORDER = ['planner', 'analyst', 'sourcing', 'comms', 'guardian', 'executor', 'reporter']
