export class TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  constructor(model = 'gpt-4.1') {
    this.knowledgeCutOff = '2021-09-01'
    switch (model) {
      case 'o4-mini':
        this.maxTokens = 200000
        this.responseTokens = 100000
        this.knowledgeCutOff = '2024-06-01'
        break
      case 'o3':
        this.maxTokens = 200000
        this.responseTokens = 100000
        this.knowledgeCutOff = '2024-06-01'
        break
      case 'o3-mini':
        this.maxTokens = 200000
        this.responseTokens = 100000
        this.knowledgeCutOff = '2023-10-01'
        break
      case 'o1':
        this.maxTokens = 200000
        this.responseTokens = 100000
        this.knowledgeCutOff = '2023-10-01'
        break
      case 'gpt-4.1':
      case 'gpt-4.1-mini':
      case 'gpt-4.1-nano':
        this.maxTokens = 1047576
        this.responseTokens = 32768
        this.knowledgeCutOff = '2024-06-01'
        break
      case 'gpt-4o-mini':
        this.maxTokens = 128000
        this.responseTokens = 16384
        this.knowledgeCutOff = '2023-10-01'
        break
      case 'gpt-4-turbo':
        this.maxTokens = 128000
        this.responseTokens = 4000
        this.knowledgeCutOff = '2023-12-01'
        break
      case 'gpt-4':
        this.maxTokens = 8000
        this.responseTokens = 2000
        break
      // Claude 4 Series - Latest 2025 models
      case 'claude-opus-4':
        this.maxTokens = 200000
        this.responseTokens = 32768
        this.knowledgeCutOff = '2025-03-01'
        break
      case 'claude-sonnet-4':
        this.maxTokens = 200000
        this.responseTokens = 64000
        this.knowledgeCutOff = '2025-03-01'
        break
      // Claude 3.7 Series
      case 'claude-3-7-sonnet':
        this.maxTokens = 200000
        this.responseTokens = 16384
        this.knowledgeCutOff = '2024-12-01'
        break
      // Claude 3.5 Series - Updated latest versions
      case 'claude-3-5-sonnet-20241022':
      case 'claude-3-5-sonnet-20240620':
        this.maxTokens = 200000
        this.responseTokens = 8192
        this.knowledgeCutOff = '2024-04-01'
        break
      case 'claude-3-5-haiku-20241022':
        this.maxTokens = 200000
        this.responseTokens = 10000
        this.knowledgeCutOff = '2024-04-01'
        break
      case 'claude-3-haiku-20240307':
        this.maxTokens = 200000
        this.responseTokens = 4096
        this.knowledgeCutOff = '2024-04-01'
        break
      case 'claude-3-opus-20240229':
        this.maxTokens = 200000
        this.responseTokens = 4096
        this.knowledgeCutOff = '2023-08-01'
        break
      default:
        this.maxTokens = 4000
        this.responseTokens = 1000
        break
    }
    // provide some margin for the request tokens
    this.requestTokens = this.maxTokens - this.responseTokens - 100
  }

  string(): string {
    return `max_completion_tokens=${this.maxTokens}, request_tokens=${this.requestTokens}, response_tokens=${this.responseTokens}`
  }
}
