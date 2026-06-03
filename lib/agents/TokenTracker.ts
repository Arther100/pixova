import { PIPELINE_TOKEN_BUDGETS, MODEL_PRICING_USD } from './config'

export interface AgentUsage {
  input: number
  output: number
  cost: number
  duration: number
  model: string
  status: 'completed' | 'failed' | 'skipped' | 'fallback'
}

export class TokenTracker {
  private agents: Map<string, AgentUsage> = new Map()
  private totalInput = 0
  private totalOutput = 0
  private totalCost = 0
  private pipelineBudget: { max_input: number; max_output: number }

  constructor(pipelineName: string) {
    this.pipelineBudget =
      PIPELINE_TOKEN_BUDGETS[pipelineName] ?? { max_input: 5000, max_output: 2000 }
  }

  addUsage(
    agentName: string,
    model: string,
    input: number,
    output: number,
    duration: number,
    status: AgentUsage['status'] = 'completed'
  ): void {
    const cost = this.calculateCost(model, input, output)
    this.agents.set(agentName, { input, output, cost, duration, model, status })
    this.totalInput += input
    this.totalOutput += output
    this.totalCost += cost
  }

  calculateCost(model: string, input: number, output: number): number {
    const pricing = MODEL_PRICING_USD[model]
    if (!pricing) return 0
    return (
      (input  / 1_000_000) * pricing.input_per_1m +
      (output / 1_000_000) * pricing.output_per_1m
    )
  }

  isOverBudget(): boolean {
    return (
      this.totalInput  > this.pipelineBudget.max_input ||
      this.totalOutput > this.pipelineBudget.max_output
    )
  }

  getRemainingBudget(): { input: number; output: number } {
    return {
      input:  Math.max(0, this.pipelineBudget.max_input  - this.totalInput),
      output: Math.max(0, this.pipelineBudget.max_output - this.totalOutput),
    }
  }

  getSummary(): {
    total_input: number
    total_output: number
    total_cost_usd: number
    agents: Record<string, AgentUsage>
  } {
    return {
      total_input:    this.totalInput,
      total_output:   this.totalOutput,
      total_cost_usd: this.totalCost,
      agents:         Object.fromEntries(this.agents),
    }
  }

  get totalTokens(): number {
    return this.totalInput + this.totalOutput
  }

  get totalCostUSD(): number {
    return this.totalCost
  }
}
