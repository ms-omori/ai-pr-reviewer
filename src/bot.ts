import './fetch-polyfill'

import {info, setFailed, warning} from '@actions/core'
import {
  ChatGPTAPI,
  ChatGPTError,
  ChatMessage,
  SendMessageOptions
  // eslint-disable-next-line import/no-unresolved
} from 'chatgpt'
import pRetry from 'p-retry'
import {OpenAIOptions, Options} from './options'

// define type to save parentMessageId and conversationId
export interface Ids {
  parentMessageId?: string
  conversationId?: string
}

// Claude API response interface
interface ClaudeMessage {
  id: string
  type: string
  role: string
  content: Array<{
    type: string
    text: string
  }>
  model: string
  stop_reason: string
  stop_sequence?: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export class Bot {
  private readonly api: ChatGPTAPI | null = null // not free
  private readonly options: Options
  private readonly openaiOptions: OpenAIOptions

  constructor(options: Options, openaiOptions: OpenAIOptions) {
    this.options = options
    this.openaiOptions = openaiOptions

    // Initialize OpenAI API if using OpenAI provider
    if (options.aiProvider === 'openai' && process.env.OPENAI_API_KEY) {
      const currentDate = new Date().toISOString().split('T')[0]
      const systemMessage = `${options.systemMessage}
Knowledge cutoff: ${openaiOptions.tokenLimits.knowledgeCutOff}
Current date: ${currentDate}

IMPORTANT: Entire response must be in the language with ISO code: ${options.language}
`

      // Check if model is a reasoning model (o1, o3, o4-mini series)
      const isReasoningModel = /^(o1|o3|o4-mini)/.test(openaiOptions.model)

      const completionParams: any = {
        model: openaiOptions.model
      }

      // Only add temperature for non-reasoning models
      if (!isReasoningModel) {
        completionParams.temperature = options.openaiModelTemperature
      }

      this.api = new ChatGPTAPI({
        apiBaseUrl: options.apiBaseUrl,
        systemMessage,
        apiKey: process.env.OPENAI_API_KEY,
        apiOrg: process.env.OPENAI_API_ORG ?? undefined,
        debug: options.debug,
        maxModelTokens: openaiOptions.tokenLimits.maxTokens,
        maxResponseTokens: openaiOptions.tokenLimits.responseTokens,
        completionParams
      })
    } else if (
      options.aiProvider === 'claude' &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      const err =
        "Unable to initialize Claude API, 'ANTHROPIC_API_KEY' environment variable is not available"
      throw new Error(err)
    } else {
      const err =
        "Unable to initialize OpenAI API, 'OPENAI_API_KEY' environment variable is not available"
      throw new Error(err)
    }
  }

  chat = async (message: string, ids: Ids): Promise<[string, Ids]> => {
    let res: [string, Ids] = ['', {}]
    try {
      if (this.options.aiProvider === 'openai') {
        res = await this.chatOpenAI(message, ids)
      } else if (this.options.aiProvider === 'claude') {
        res = await this.chatClaude(message)
      }
      return res
    } catch (e: unknown) {
      if (e instanceof ChatGPTError) {
        warning(`Failed to chat: ${e}, backtrace: ${e.stack}`)
      } else {
        warning(`Failed to chat: ${e}`)
      }
      return res
    }
  }

  private readonly chatOpenAI = async (
    message: string,
    ids: Ids
  ): Promise<[string, Ids]> => {
    // record timing
    const start = Date.now()
    if (!message) {
      return ['', {}]
    }

    let response: ChatMessage | undefined

    if (this.api != null) {
      const opts: SendMessageOptions = {
        timeoutMs: this.options.openaiTimeoutMS
      }
      if (ids.parentMessageId) {
        opts.parentMessageId = ids.parentMessageId
      }
      try {
        response = await pRetry(() => this.api!.sendMessage(message, opts), {
          retries: this.options.openaiRetries
        })
      } catch (e: unknown) {
        if (e instanceof ChatGPTError) {
          info(
            `response: ${response}, failed to send message to openai: ${e}, backtrace: ${e.stack}`
          )
        }
      }
      const end = Date.now()
      info(`response: ${JSON.stringify(response)}`)
      info(
        `openai sendMessage (including retries) response time: ${
          end - start
        } ms`
      )
    } else {
      setFailed('The OpenAI API is not initialized')
    }
    let responseText = ''
    if (response != null) {
      responseText = response.text
    } else {
      warning('openai response is null')
    }
    // remove the prefix "with " in the response
    if (responseText.startsWith('with ')) {
      responseText = responseText.substring(5)
    }
    if (this.options.debug) {
      info(`openai responses: ${responseText}`)
    }
    const newIds: Ids = {
      parentMessageId: response?.id,
      conversationId: response?.conversationId
    }
    return [responseText, newIds]
  }

  private readonly chatClaude = async (
    message: string
  ): Promise<[string, Ids]> => {
    // record timing
    const start = Date.now()
    if (!message) {
      return ['', {}]
    }

    let response: ClaudeMessage | undefined

    if (process.env.ANTHROPIC_API_KEY) {
      const requestBody = {
        model: this.openaiOptions.model,
        // eslint-disable-next-line camelcase
        max_tokens: this.openaiOptions.tokenLimits.responseTokens,
        temperature: this.options.openaiModelTemperature,
        system: `${this.options.systemMessage}
Knowledge cutoff: ${this.openaiOptions.tokenLimits.knowledgeCutOff}
Current date: ${new Date().toISOString().split('T')[0]}

IMPORTANT: Entire response must be in the language with ISO code: ${
          this.options.language
        }`,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      }

      try {
        response = await pRetry(
          async () => {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify(requestBody)
            })

            if (!res.ok) {
              throw new Error(
                `Claude API error: ${res.status} ${res.statusText}`
              )
            }

            return await res.json()
          },
          {
            retries: this.options.openaiRetries
          }
        )
      } catch (e: unknown) {
        info(`failed to send message to claude: ${e}`)
      }

      const end = Date.now()
      info(`response: ${JSON.stringify(response)}`)
      info(
        `claude sendMessage (including retries) response time: ${
          end - start
        } ms`
      )
    } else {
      setFailed('The Claude API is not initialized')
    }

    let responseText = ''
    if (response != null && response.content && response.content[0]) {
      responseText = response.content[0].text
    } else {
      warning('claude response is null')
    }

    // remove the prefix "with " in the response
    if (responseText.startsWith('with ')) {
      responseText = responseText.substring(5)
    }

    if (this.options.debug) {
      info(`claude responses: ${responseText}`)
    }

    const newIds: Ids = {
      parentMessageId: response?.id,
      conversationId: undefined // Claude doesn't use conversation IDs like OpenAI
    }
    return [responseText, newIds]
  }
}
