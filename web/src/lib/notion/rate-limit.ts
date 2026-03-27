// Notion API: 最大3リクエスト/秒 + エクスポネンシャルバックオフリトライ
import pLimit from 'p-limit'
import pRetry from 'p-retry'

const limiter = pLimit(3)

export function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return limiter(() =>
    pRetry(fn, {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
    })
  )
}
