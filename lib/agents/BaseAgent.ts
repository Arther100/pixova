import 'server-only'

export interface AgentResult<T> {
  output: T
  inputTokens: number
  outputTokens: number
  durationMs: number
  status: 'completed' | 'failed' | 'fallback'
  error?: string
}

export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: string
  abstract readonly model: string
  abstract readonly temperature: number
  abstract readonly maxInputTokens: number
  abstract readonly maxOutputTokens: number
  abstract readonly systemPrompt: string

  abstract buildPrompt(input: TInput): string
  abstract parseOutput(raw: string): TOutput
  abstract getFallback(input: TInput): TOutput

  async run(input: TInput): Promise<AgentResult<TOutput>> {
    const startTime = Date.now()
    const prompt = this.buildPrompt(input)
    const estimatedTokens = Math.ceil((this.systemPrompt.length + prompt.length) / 4)

    if (estimatedTokens > this.maxInputTokens * 1.3) {
      return {
        output: this.getFallback(input),
        inputTokens: 0,
        outputTokens: 0,
        durationMs: Date.now() - startTime,
        status: 'fallback',
        error: 'Prompt exceeds token budget estimate',
      }
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':         process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Type':      'application/json',
        },
        body: JSON.stringify({
          model:       this.model,
          max_tokens:  this.maxOutputTokens,
          temperature: this.temperature,
          system:      this.systemPrompt,
          messages:    [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`API ${response.status}: ${errText}`)
      }

      const data = await response.json() as {
        content?: Array<{ text?: string }>
        usage?:   { input_tokens?: number; output_tokens?: number }
      }

      const raw          = data.content?.[0]?.text?.trim() ?? ''
      const inputTokens  = data.usage?.input_tokens  ?? 0
      const outputTokens = data.usage?.output_tokens ?? 0

      return {
        output:      this.parseOutput(raw),
        inputTokens,
        outputTokens,
        durationMs: Date.now() - startTime,
        status: 'completed',
      }
    } catch (err) {
      return {
        output:      this.getFallback(input),
        inputTokens: 0,
        outputTokens: 0,
        durationMs: Date.now() - startTime,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  protected safeParseJSON<T>(raw: string, fallback: T): T {
    try {
      const clean = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
      return JSON.parse(clean) as T
    } catch {
      return fallback
    }
  }

  protected truncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4
    return text.length <= maxChars ? text : text.slice(0, maxChars) + '...'
  }

  protected formatRupees(paise: number): string {
    return `₹${(paise / 100).toLocaleString('en-IN')}`
  }
}
