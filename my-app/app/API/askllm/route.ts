import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import type { ViewType } from '@/lib/types';


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


const SYSTEM_PROMPTS: Record<ViewType, string> = {
  sidewallView: `You are an expert in reading tyre sizes. Look at the sidewall and find the tyre size marking.
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

  treadView: `You are a professional tyre inspector with precision measurement tools. Analyze these tyre images with exact measurements.

    MEASUREMENT REQUIREMENTS:
    1. REQUIRED: Specific numerical tread depth measurements
      - Center groove depth in mm
      - Inner edge depth in mm
      - Outer edge depth in mm
      Example: "Centre: 3.2mm, Inner: 2.8mm, Outer: 3.0mm"

    2. REQUIRED: Percentage estimates for wear patterns
      - State wear percentages for each area
      Example: "Inner edge 70% worn, center 30% worn, outer edge 40% worn"

    3. DAMAGE MEASUREMENTS:
      - Size of any cuts/gashes in mm
      - Depth of any punctures in mm
      - Width of any abnormal wear patterns in mm

    If you cannot determine an exact measurement, provide your best estimate and state "estimated".

  Return a JSON response with EXACTLY this structure:
  {
    "safety": {
      "isSafeToDrive": boolean,
      "visibleDamage": boolean,
      "sufficientTread": boolean,
      "unevenWear": boolean,
      "needsReplacement": boolean
    },
    "explanations": {
      "safety": "Detailed overall safety assessment with specific concerns",
      "damage": "Description of any visible damage or irregular conditions",
      "tread": "Specific tread depth observations and estimated depth in mm",
      "wear": "Analysis of wear patterns",
      "replacement": "Clear recommendation with timeline (immediate/soon/monitor)"
    }
  }`
};

const USER_PROMPTS: Record<ViewType, string> = {
  sidewallView: `Analyse this tyre sidewall image. Focus first on the raised size markings that follow 
the pattern [width]/[aspect ratio]R[diameter]. For example: 215/55R17.

Please provide:
1. Complete tyre size information from the raised numbers
2. Condition of sidewall markings
3. Any visible damage or aging signs`,

treadView: `Analyse these tyre tread images for safety and measurements. Focus on:

1. Estimate the tread depth in mm
2. Wear pattern analysis 
3. Any visible damage or abnormalities 
4. Specific safety concerns 
5. Clear replacement recommendations`
};




export const config = {
  api: {
    bodyParser: false, // Disabling body parser as we're handling raw body
  },
}

export async function POST(request: NextRequest) {
  const DEBUG = true; // Debug flag
  
  try {
    if (DEBUG) {
      console.group('\n🚀 NEW API REQUEST');
      console.time('API Request Duration');
    }
    
    const formData = await request.formData();
    const viewType = formData.get('viewType') as ViewType;
    const isVideo = formData.get('isVideo') === 'true';
    
    if (DEBUG) {
      console.log('Request Details:', {
        viewType,
        isVideo,
        formDataKeys: Array.from(formData.keys())
      });
    }
    
    // Define the response type structure
    interface AnthropicResponse {
      id: string;
      type: string;
      role: string;
      content: Array<{
        type: string;
        text?: string;
        source?: {
          type: string;
          media_type: string;
          data: string;
        };
      }>;
      model: string;
    }

    // Define the message content types
    type MessageContentText = {
      type: "text";
      text: string;
    };

    type MessageContentImage = {
      type: "image";
      source: {
        type: "base64";
        media_type: "image/jpeg";
        data: string;
      };
    };

    type Content = MessageContentText | MessageContentImage;

    let llmResponse: AnthropicResponse;
    
    if (isVideo) {
      const files = formData.getAll('files[]') as string[];
      
      const content: Content[] = [
        {
          type: "text",
          text: `${SYSTEM_PROMPTS[viewType]}\n\n${USER_PROMPTS[viewType]}\n\nAnalyze these images:`
        } as MessageContentText,
        ...files.map(frame => ({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: frame.replace(/^data:image\/\w+;base64,/, '')
          }
        } as MessageContentImage))
      ];

      llmResponse = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1500,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: content as Content[]
        }]
      }) as AnthropicResponse;
      
    } else {
      const file = formData.get('file') as string | File;
      if (!file) {
        throw new Error('No file provided');
      }
      
      let base64File: string;
      
      if (typeof file === 'string') {
        base64File = file;
      } else {
        const bytes = await file.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString('base64');
        base64File = `data:${file.type};base64,${base64Data}`;
      }
      
      llmResponse = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        temperature: 0.4,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `${SYSTEM_PROMPTS[viewType]}\n\n${USER_PROMPTS[viewType]}`
            } as MessageContentText,
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64File.replace(/^data:image\/\w+;base64,/, '')
              }
            } as MessageContentImage
          ]
        }]
      });
    }
    
    if (llmResponse?.content && llmResponse.content.length > 0) {
      try {
        // Find the first text content
        const textContent = llmResponse.content.find(
          (c: { type: string; text?: string }): c is { type: 'text'; text: string; } => c.type === 'text'
        );
        
        if (!textContent) {
          throw new Error('No text content in response');
        }

        // Extract the complete JSON object
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }

        const jsonString = jsonMatch[0].trim();
        
        // Clean up any potential whitespace or newline issues
        const cleanedJson = jsonString
          .replace(/\n\s*/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (DEBUG) {
          console.group('🤖 Claude Response');
          console.log('Raw Response:', llmResponse);
          console.log('Extracted JSON:', cleanedJson);
          try {
            const parsedContent = JSON.parse(cleanedJson);
            console.log('Parsed Content:', parsedContent);
          } catch (parseError) {
            console.error('Parse Error:', parseError);
            console.log('JSON String Length:', cleanedJson.length);
            console.log('First 500 chars:', cleanedJson.substring(0, 500));
            console.log('Last 500 chars:', cleanedJson.substring(cleanedJson.length - 500));
          }
          console.groupEnd();
        }
        
        return Response.json(JSON.parse(cleanedJson));
      } catch (error) {
        console.error('Error parsing Claude response:', error);
        throw new Error('Invalid JSON in Claude response');
      }
    } else {
      if (DEBUG) {
        console.error('❌ Invalid Claude Response Structure:', llmResponse);
      }
      throw new Error('Invalid response format from Claude');
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    }, { status: 500 });
  } finally {
    if (DEBUG) {
      console.timeEnd('API Request Duration');
      console.groupEnd();
    }
  }
}