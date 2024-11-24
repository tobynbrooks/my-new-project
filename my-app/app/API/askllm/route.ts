import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { TyreSize, SafetyInfo, Explanations, TyreAnalysis, TireImage, ViewType, AnalysisState } from '../../../lib/types';



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

  CRITICAL RULES:
  1. If ANY part of the size marking is unclear or not visible:
     - Set isImageClear to false
     - Set ALL fields including fullSize to "not available"
     - Do not provide partial information
     - Do not guess or infer any numbers
  2. fullSize must ONLY be populated if ALL three numbers are clearly visible
  3. If you see other text (like brand names) but not the complete size marking, all fields must be "not available"
  4. Respond with "not available" rather than making assumptions

  Return a JSON response with EXACTLY this structure:
  {
    "tyreSize": {
      "width": "number or 'not available'",
      "aspectRatio": "number or 'not available'",
      "wheelDiameter": "number or 'not available'",
      "fullSize": "complete size or 'not available'",
      "isImageClear": false if ANY numbers are unclear or missing
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
    const file = formData.get('file') as File;
    const viewType = formData.get('viewType') as 'sidewallView' | 'treadView';
    const mediaType = formData.get('mediaType') as 'image' | 'video';
    
    if (!file) {
      console.error('❌ Error: No file provided');
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const VIDEO_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB for videos
    const size_limit = mediaType === 'video' ? VIDEO_SIZE_LIMIT : MAX_IMAGE_SIZE;
    
    if (file.size > size_limit) {
      console.error('❌ Error: File size exceeds limit');
      return Response.json({ 
        error: `File size exceeds ${mediaType === 'video' ? '50MB' : '4MB'} limit` 
      }, { status: 400 });
    }

    if (mediaType === 'video' && !file.type.startsWith('video/')) {
      return Response.json({ error: 'Invalid video format' }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64File = `data:${file.type};base64,${buffer.toString('base64')}`;
    
    const mediaPrompt = mediaType === 'video' 
      ? `This is a video of the tire ${viewType}. Please analyze all visible aspects carefully.`
      : USER_PROMPTS[viewType];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",  // Make sure to use vision model
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
                text: mediaPrompt
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: base64File,
                  detail: mediaType === 'video' ? 'high' : 'auto' 
                } 
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
        console.log('\n🔍 SIDEWALL ANALYSIS DEBUGGER');
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
        const analysis = JSON.parse(contentString) as TyreAnalysis;
        
        // Force consistency: if any component is not available, everything should be not available
        if (
          (analysis.tyreSize.width as any) === 'not available' || 
          !analysis.tyreSize.width ||
          (analysis.tyreSize.aspectRatio as any) === 'not available' || 
          !analysis.tyreSize.aspectRatio ||
          (analysis.tyreSize.wheelDiameter as any) === 'not available' || 
          !analysis.tyreSize.wheelDiameter
        ) {
          analysis.tyreSize.isImageClear = false;
          (analysis.tyreSize.width as any) = 'not available';
          (analysis.tyreSize.aspectRatio as any) = 'not available';
          (analysis.tyreSize.wheelDiameter as any) = 'not available';
          analysis.tyreSize.fullSize = 'not available';
        }

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