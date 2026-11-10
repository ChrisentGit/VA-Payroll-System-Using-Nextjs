type RequestResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string }

// For buttons that call the API and report the outcome with a toast.
// Never throws, and a response without a JSON body still gives a usable message.
export async function sendRequest(
  url: string,
  options: { method: string; body?: object; fallbackError?: string }
): Promise<RequestResult> {
  const { method, body, fallbackError = 'Something went wrong' } = options

  try {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json().catch(() => ({}))

    return response.ok ? { ok: true, data } : { ok: false, error: data.error || fallbackError }
  } catch (err) {
    console.error('Request failed:', err)
    return { ok: false, error: 'Network error. Please try again.' }
  }
}
