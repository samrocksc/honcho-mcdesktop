const baseUrl = (): string =>
  process.env.HONCHO_BASE_URL ?? 'http://localhost:8000'

const authHeaders = (): Record<string, string> => {
  const key = process.env.HONCHO_API_KEY
  return key ? { Authorization: `Bearer ${key}` } : {}
}

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Honcho ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export const honchoGet = <T>(path: string): Promise<T> =>
  fetch(`${baseUrl()}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  }).then(handleResponse<T>)

export const honchoPost = <T>(path: string, body: unknown): Promise<T> =>
  fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then(handleResponse<T>)

export const honchoPostStream = (path: string, body: unknown): Promise<Response> =>
  fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
