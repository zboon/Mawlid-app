/* Zone 2 · der persönliche Teil der API.
 *
 * Getrennt vom Inhalts-Client: andere Basis (/api/me), ein Pflichtheader
 * (X-Device-Id), kein Cache. Die Geräte-ID entsteht beim ersten Aufruf und
 * bleibt im localStorage — sie ist die Adresse dieses Geräts, solange sich
 * niemand anmeldet (04-backend-api.md, „Ohne Anmeldung").
 *
 * Alle Schreibaufrufe hier sind „Feuer und vergessen" aus Sicht der
 * Oberfläche: gerendert wird aus dem lokalen Spiegel (stores/personal.ts),
 * der Server ist die Sicherung. Ein fehlgeschlagener Abgleich ist deshalb
 * kein Fehlerzustand der Oberfläche — er wird gemeldet (Promise), aber die
 * Bedienung hängt nie an ihm.
 */

import type { MeState } from '@mawalid/shared'

const BASE = import.meta.env.VITE_API_URL ?? ''

const DEVICE_KEY = 'mawlid-device-id'

export function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, fresh)
    return fresh
  } catch {
    /* Privater Modus: eine flüchtige ID je Sitzung. Der Server legt dann
       ein Gerät an, das nie wiederkommt — verschmerzbar und selten. */
    return crypto.randomUUID()
  }
}

async function call(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'X-Device-Id': deviceId() }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}/api/me${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`me: ${method} ${path} → ${res.status}`)
  return res
}

export async function fetchMe(): Promise<MeState> {
  const res = await call('GET', '/')
  return (await res.json()) as MeState
}

export const mePut = (path: string, body?: unknown) => call('PUT', path, body)
export const meDelete = (path: string) => call('DELETE', path)
