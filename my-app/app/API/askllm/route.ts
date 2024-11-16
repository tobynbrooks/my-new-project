import OpenAI from 'openai';
import { NextRequest } from 'next/server';

interface TyreAnalysis {
  tyreSize: {
    width: string | null;
    aspectRatio: string | null;
    wheelDiameter: string | null;
    fullSize: string | null;
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

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

const SYSTEM_PROMPTS = {
  sidewallView: `You are a tyre expert. Look at the sidewall and find the tyre size marking.
  The size will be three numbers separated like this: 255/65R17
  - First number is width (e.g. 255)
  - Second number after the slash is aspect ratio (e.g. 65)
  - Last number after R is wheel diameter (e.g. 17)

  In this image, find these three numbers and return them in this EXACT format:
  {
    "tyreSize": {
      "width": "255",
      "aspectRatio": "65",
      "wheelDiameter": "17",
      "fullSize": "255/65R17"
    },
    

Return a JSON response with EXACTLY this structure:
{
  "tyreSize": {
    "width": "number in mm",        // e.g., "215"
    "aspectRatio": "number",        // e.g., "55"
    "wheelDiameter": "inches",      // e.g., "17"
    "fullSize": "complete size"     // e.g., "215/55R17"
  },
 
  "explanations": {
    "safety": "Detailed overall safety assessment with specific concerns",
    "damage": "Description of any visible damage or irregular conditions",
    "tread": "Specific tread depth observations and measurements",
    "wear": "Analysis of wear patterns and possible causes",
    "replacement": "Clear recommendation with timeline (immediate/soon/monitor)"
  }
}`,

  treadView: `You are a tyre expert. Always use British English spelling (tyre, not tire). 

When analyzing the tread image, carefully assess:
- Tread depth (minimum safe depth is 1.6mm)
- Wear patterns across the tread surface
- Any visible damage or abnormalities
- Signs of alignment issues

Return a JSON response with EXACTLY this structure:
{
  "tyreSize": {
    "width": null,
    "aspectRatio": null,
    "wheelDiameter": null,
    "fullSize": null
  },
  "safety": {
    "isSafeToDrive": boolean,       // true only if NO safety concerns found
    "visibleDamage": boolean,       // true if ANY damage is visible
    "sufficientTread": boolean,     // true if tread depth > 1.6mm
    "unevenWear": boolean,         // true if wear pattern is irregular
    "needsReplacement": boolean    // true if ANY major issues found
  },
  "explanations": {
    "safety": "Detailed overall safety assessment with specific concerns",
    "damage": "Description of any visible damage or irregular conditions",
    "tread": "Specific tread depth observations and measurements",
    "wear": "Analysis of wear patterns and possible causes",
    "replacement": "Clear recommendation with timeline (immediate/soon/monitor)"
  }
}`
};

const USER_PROMPTS = {
  sidewallView: `Analyze this tyre sidewall image. Focus first on the raised size markings that follow 
the pattern [width]/[aspect ratio]R[diameter]. For example: 215/55R17.

Please provide:
1. Complete tyre size information from the raised numbers
2. Condition of sidewall markings
3. Any visible damage or aging signs`,

  treadView: `Analyze this tyre tread image for safety and measurements. Consider:
1. Exact tread depth if visible
2. Wear pattern analysis
3. Any visible damage or abnormalities
4. Specific safety concerns
5. Clear replacement recommendations`
};

export async function POST(request: NextRequest) {
  try {
    console.log('\n----------------------------------------');
    console.log('🚀 NEW REQUEST RECEIVED');
    console.log('----------------------------------------\n');

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const viewType = formData.get('viewType') as 'sidewallView' | 'treadView';
    
    if (!image) {
      console.error('❌ Error: No image provided');
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }
    
    if (image.size > MAX_IMAGE_SIZE) {
      console.error('❌ Error: Image size exceeds limit');
      return Response.json({ error: 'Image size exceeds 4MB limit' }, { status: 400 });
    }
    
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",  
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPTS[viewType]
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: USER_PROMPTS[viewType]
              },
              { 
                type: "image_url", 
                image_url: { url: base64Image } 
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.4,
        response_format: { type: "json_object" }
      }, {
        signal: controller.signal
      });
    
      clearTimeout(timeoutId);
    
      // Add debug section here
      if (viewType === 'sidewallView') {
        console.log('\n🔍 SIDEWALL ANALYSIS DEBUG');
        console.log('----------------------------------------');
        console.log('Raw Response:', completion.choices[0]?.message?.content);
        try {
          const parsedContent = JSON.parse(completion.choices[0]?.message?.content || '{}');
          console.log('Parsed Size:', {
            full: parsedContent.tyreSize?.fullSize || 'NOT FOUND',
            width: parsedContent.tyreSize?.width || 'NOT FOUND',
            aspect: parsedContent.tyreSize?.aspectRatio || 'NOT FOUND',
            diameter: parsedContent.tyreSize?.wheelDiameter || 'NOT FOUND'
          });
        } catch (e) {
          console.log('Parse Error:', e);
        }
        console.log('----------------------------------------\n');
      }
      
      const contentString = completion.choices[0]?.message?.content;
      
      if (!contentString) {
        throw new Error('No analysis results received');
      }

      try {
        const analysis = JSON.parse(contentString) as TyreAnalysis;  // Changed from TireAnalysis
        return Response.json(analysis);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error('Failed to parse analysis results');
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return Response.json({ error: 'Request timed out - please try again' }, { status: 408 });
        }
        return Response.json({ error: error.message }, { status: 500 });
      }
      return Response.json({ error: 'Unknown error occurred' }, { status: 500 });
    }

  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}