
import { ExtractionField, FieldType, AppSettings } from "../types.ts";

export async function extractData(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  settings: AppSettings
) {
  return extractFromOpenAI(fileDataBase64, fields, mimeType, settings.openai!, settings.systemPrompt, settings.temperature);
}

async function extractFromOpenAI(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  config: { baseUrl: string; apiKey: string; model: string },
  systemPrompt: string,
  temperature: number
) {
  let url = config.baseUrl.trim();
  if (!url.endsWith('/chat/completions')) {
    url = `${url.replace(/\/+$/, '')}/chat/completions`;
  }

  const base64Data = fileDataBase64.includes(',') ? fileDataBase64 : `data:${mimeType};base64,${fileDataBase64}`;

  const schema: Record<string, any> = {};
  fields.forEach(f => {
    schema[f.key] = f.description;
  });

  const prompt = `${systemPrompt}
  Required JSON structure keys and descriptions: ${JSON.stringify(schema)}
  Return ONLY valid JSON matching this structure. Do not include any other text.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
        response_format: { type: 'json_object' },
        temperature: temperature
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from AI provider");

    return typeof content === 'string' ? JSON.parse(content) : content;
  } catch (e: any) {
    console.error("OpenAI Fetch Error:", e);
    throw e;
  }
}
