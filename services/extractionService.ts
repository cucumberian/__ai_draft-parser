
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionField, FieldType, AppSettings } from "../types";

export async function extractData(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  settings: AppSettings
) {
  if (settings.provider === 'openai' && settings.openai) {
    return extractFromOpenAI(fileDataBase64, fields, mimeType, settings.openai, settings.systemPrompt, settings.temperature);
  }
  return extractFromGemini(fileDataBase64, fields, mimeType, settings.systemPrompt, settings.temperature);
}

async function extractFromGemini(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string,
  systemPrompt: string,
  temperature: number
) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  const properties: Record<string, any> = {};
  const required: string[] = [];

  fields.forEach(field => {
    required.push(field.key);
    switch (field.type) {
      case FieldType.STRING: properties[field.key] = { type: Type.STRING, description: field.description }; break;
      case FieldType.NUMBER: properties[field.key] = { type: Type.NUMBER, description: field.description }; break;
      case FieldType.BOOLEAN: properties[field.key] = { type: Type.BOOLEAN, description: field.description }; break;
      case FieldType.ARRAY_STRING: properties[field.key] = { type: Type.ARRAY, items: { type: Type.STRING }, description: field.description }; break;
      case FieldType.ARRAY_NUMBER: properties[field.key] = { type: Type.ARRAY, items: { type: Type.NUMBER }, description: field.description }; break;
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: fileDataBase64.split(',')[1] || fileDataBase64 } },
          { text: systemPrompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties, required },
        temperature: temperature,
      },
    });

    return JSON.parse(response.text);
  } catch (e: any) {
    console.error("Gemini Extraction Error:", e);
    throw e;
  }
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
    if (e instanceof TypeError && e.message === "Failed to fetch") {
      throw new Error("Network error: Failed to connect to the API server. Check URL and connection.");
    }
    throw e;
  }
}
