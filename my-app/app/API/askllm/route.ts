
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
          content: "You are a tire analysis expert. Provide structured boolean responses about tire condition. Focus only on safety-critical aspects."
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this tire and provide YES/NO answers for the following questions:\n1. Is the tire safe to drive? \n2. Is there visible damage?\n3. Is the tread depth sufficient?\n4. Are there signs of uneven wear?\n5. Does the tire need immediate replacement?\n\nFor each YES/NO answer, provide a one-line explanation." 
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
      max_tokens: 500,
    });

    const analysis = response.choices[0].message.content;
    console.log('Analysis:', analysis);

    return NextResponse.json({ analysis: analysis });
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