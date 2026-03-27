// AES-GCM 256bit 暗号化・復号
// ENCRYPTION_KEY: 64文字のhex文字列（32バイト）

const ALGORITHM = 'AES-GCM' as const

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(hex.length / 2)
  const arr = new Uint8Array(buffer)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return arr
}

function bytesToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getKey(): Promise<CryptoKey> {
  const raw = hexToBytes(process.env.ENCRYPTION_KEY!)
  return crypto.subtle.importKey('raw', raw, { name: ALGORITHM }, false, ['encrypt', 'decrypt'])
}

// 暗号化: "<iv_hex>:<ciphertext_hex>" 形式で返す
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(encrypted))}`
}

// 復号: encrypt() が返した文字列を受け取る
export async function decrypt(data: string): Promise<string> {
  const colonIndex = data.indexOf(':')
  const iv = hexToBytes(data.slice(0, colonIndex))
  const ciphertext = hexToBytes(data.slice(colonIndex + 1))
  const key = await getKey()
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}
