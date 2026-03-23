
import { ExtractionField, AppSettings } from "../types";

export async function extractData(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  settings: AppSettings,
  signal?: AbortSignal
) {
  return extractFromOpenAI(fileDataBase64, fields, mimeType, settings.openai, settings.systemPrompt, settings.temperature, signal);
}

async function apiFetch(url: string, options: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.apiRequest) {
    const headers: Record<string, string> = {};
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((v, k) => { headers[k] = v; });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    const result = await (window as any).electronAPI.apiRequest({
      url,
      method: options.method || 'POST',
      headers,
      body: options.body as string,
    });

    return {
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      text: async () => result.body,
      json: async () => JSON.parse(result.body),
    } as Response;
  }

  return fetch(url, options);
}

async function extractFromOpenAI(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  config: { baseUrl: string; apiKey: string; model: string },
  systemPrompt: string,
  temperature: number,
  signal?: AbortSignal
) {
  let url = config.baseUrl.trim();
  if (!url.endsWith('/chat/completions')) {
    url = `${url.replace(/\/+$/, '')}/chat/completions`;
  }

  const base64Data = fileDataBase64.includes(',') ? fileDataBase64 : `data:${mimeType};base64,${fileDataBase64}`;

  const schema: Record<string, string> = {};
  fields.forEach(f => {
    schema[f.key] = f.description;
  });

  const prompt = `${systemPrompt}
  Required JSON structure keys and descriptions: ${JSON.stringify(schema)}
  Return ONLY valid JSON matching this structure. Do not include any other text.`;

  const body = JSON.stringify({
    model: config.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64Data } }
        ]
      }
    ],
    temperature: temperature,
    max_tokens: 4096,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  let response: Response;
  try {
    response = await apiFetch(url, {
      method: 'POST',
      headers,
      body,
      signal,
    });
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
    throw new Error(`Не удалось подключиться к ${url}. Проверьте что сервер запущен.`);
  }

  const responseText = await response.text();

  if (!response.ok) {
    let errorMsg = responseText;
    try {
      const err = JSON.parse(responseText);
      errorMsg = err.error?.message || err.message || responseText;
    } catch {}
    throw new Error(`Ошибка ${response.status}: ${errorMsg}`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error('Некорректный ответ от сервера: ' + responseText.substring(0, 200));
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ от модели");

  let jsonStr = typeof content === 'string' ? content : JSON.stringify(content);
  jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Не удалось распарсить JSON из ответа: ' + jsonStr.substring(0, 200));
  }
}
