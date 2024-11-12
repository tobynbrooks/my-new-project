
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TireAnalysis {
  tireSize: {
    width: string;
    aspectRatio: string;
    wheelDiameter: string;
    fullSize: string;
  };
  safety: {
    isSafeToDrive: boolean;
    visibleDamage: boolean;
    sufficientTread: boolean;
    unevenWear: boolean;
    needsReplacement: boolean;
  };
  explanations: {
    safety: string;
    damage: string;
    tread: string;
    wear: string;
    replacement: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are a tire analysis expert. Analyze the tire image and provide a structured response.
          You must identify the tire size (if visible) and assess safety conditions.
          Always respond in the following JSON format:
          {
            "tireSize": {
              "width": "xxx", // tire width in mm
              "aspectRatio": "xx", // aspect ratio
              "wheelDiameter": "xx", // wheel diameter in inches
              "fullSize": "xxx/xx Rxx" // full tire size
            },
            "safety": {
              "isSafeToDrive": true/false,
              "visibleDamage": true/false,
              "sufficientTread": true/false,
              "unevenWear": true/false,
              "needsReplacement": true/false
            },
            "explanations": {
              "safety": "one-line explanation",
              "damage": "one-line explanation",
              "tread": "one-line explanation",
              "wear": "one-line explanation",
              "replacement": "one-line explanation"
            }
          }`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this tire image and provide the assessment in the specified JSON format. If the tire size is not visible, use null for size values." 
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0].message.content!) as TireAnalysis;
    console.log('Analysis:', analysis);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error processing image:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Error analyzing image: ${error.message}` }, 
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unknown error occurred while analyzing the image' }, 
      { status: 500 }
    );
  }
}