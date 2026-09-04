/* Der einzige Ort, an dem `fetch` steht. */

const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/content${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (cause) {
    /* Kein Netz, falscher Port, CORS. Der Unterschied ist von hier aus nicht
       erkennbar — der Browser sagt ihn absichtlich nicht. */
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(0, 'OFFLINE', 'Die API ist nicht erreichbar.')
  }

  if (!res.ok) {
    let code = `HTTP_${res.status}`
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } }
      if (body.error?.code) code = body.error.code
      if (body.error?.message) message = body.error.message
    } catch {
      /* Eine Fehlerantwort ohne JSON-Rumpf ist selten, aber möglich (ein
         Proxy dazwischen). Dann bleibt es beim Status. */
    }
    throw new ApiError(res.status, code, message)
  }

  return (await res.json()) as T
}
