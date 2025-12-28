
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionField, FieldType } from "../types";

export async function extractFromImage(
  fileDataBase64: string,
  fields: ExtractionField[],
  mimeType: string
) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Construct Schema
  const properties: Record<string, any> = {};
  const required: string[] = [];

  fields.forEach(field => {
    required.push(field.key);
    switch (field.type) {
      case FieldType.STRING:
        properties[field.key] = { type: Type.STRING, description: field.description };
        break;
      case FieldType.NUMBER:
        properties[field.key] = { type: Type.NUMBER, description: field.description };
        break;
      case FieldType.BOOLEAN:
        properties[field.key] = { type: Type.BOOLEAN, description: field.description };
        break;
      case FieldType.ARRAY_STRING:
        properties[field.key] = { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: field.description 
        };
        break;
      case FieldType.ARRAY_NUMBER:
        properties[field.key] = { 
          type: Type.ARRAY, 
          items: { type: Type.NUMBER },
          description: field.description 
        };
        break;
    }
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileDataBase64.split(',')[1] || fileDataBase64,
          },
        },
        {
          text: `You are an expert engineering assistant. Analyze the provided document (technical drawing) and extract the specific fields requested. 
          The document may be an image or a multi-page PDF. 
          If a field is not found or not applicable, return null or appropriate empty value for the type.
          Return ONLY valid JSON matching the schema provided.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: properties,
        required: required,
      },
    },
  });

  return JSON.parse(response.text);
}
