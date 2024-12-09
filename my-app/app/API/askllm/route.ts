import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import type { ViewType } from '@/lib/types';


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const USER_PROMPTS = `You are an AI system designed to analyze tyre images and provide accurate, consistent assessments of tyre condition, safety, and replacement recommendations. Your expertise is equivalent to that of a tyre inspector with 15 years of experience.

Your task is to analyze a provided tyre images. These images will either be a single image of a sidewall (sidewallView) or a series of images of a tread (treadView) of a tyre. All tread view images are of the same tyre and will be presented in landscape format. You will need to determine the type of view and then perform the appropriate analysis.

Before providing your final output, wrap your detailed analysis process inside tyre_analysis tags. Within these tags: 

1. Determine whether the image shows a sidewallView or treadView.
2. For each relevant part of the tyre:
   a. List your specific observations, numbering each one.
   b. Explain your reasoning for each observation.
3. Make initial measurements or assessments based on your observations.
4. Review your initial recommendations and brainstorm the best possible recommendations for consistency and clarity.
5. Standardize your feedback to provide clear guidance for customers regarding tyre replacement.

If the image is a sidewallView, follow these steps:
1. Examine the image for the tyre size marking, which follows the pattern [width]/[aspect ratio]R[wheel diameter] (e.g., 255/65R17).
2. If the size marking is fully visible and clear:
   a. List each visible marking on the sidewall separately, numbering them.
   b. Interpret each part of the size marking text, extracting the width, aspect ratio, and wheel diameter.
   c. Assess the condition of the sidewall markings.
   d. Check for any visible damage or aging signs, describing what you see in detail.
3. If ANY part of the size marking is unclear or not visible:
   a. Set all fields to "not available".
   b. Do not provide partial information or make assumptions.

If the image is a treadView, follow these steps:
1. Describe what you see in each section of the tread (centre, inner edge, outer edge) in detail, using a numbered list for each section.
2. Estimate the tread depth in millimetres for the centre groove, inner edge, and outer edge, explaining your reasoning for each measurement.
3. Analyse the wear pattern, providing percentage estimates for each area and explaining how you arrived at these estimates.
4. Identify any visible damage, cuts, punctures, or abnormalities, measuring their size in millimetres where possible. Describe each issue in detail.
5. Assess specific safety concerns based on your observations, explaining your reasoning.
6. Provide clear replacement recommendations with a timeline (immediate/soon/monitor), justifying your recommendation.

After your analysis, provide your final assessment in the following JSON format based on the view type:

For sidewallView:
{
  "tyreSize": {
    "width": "number or 'not available'",
    "aspectRatio": "number or 'not available'",
    "wheelDiameter": "number or 'not available'",
    "fullSize": "complete size or 'not available'",
    "isImageClear": boolean
  },
  "sidewallCondition": "description of sidewall condition",
  "visibleDamage": "description of any damage or aging signs"
}

For treadView:
{
  "treadDepth": {
    "center": "measurement in mm",
    "innerEdge": "measurement in mm",
    "outerEdge": "measurement in mm"
  },
  "wearPattern": {
    "innerEdge": "percentage worn",
    "center": "percentage worn",
    "outerEdge": "percentage worn"
  },
  "damage": "description of any damage or abnormalities with measurements",
  "safety": {
    "isSafeToDrive": boolean,
    "sufficientTread": boolean,
    "unevenWear": boolean,
    "needsReplacement": boolean
  },
  "recommendations": {
    "replacementTimeline": "immediate/soon/monitor",
    "explanation": "detailed explanation of recommendation"
  }
}
`;


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
          text: USER_PROMPTS
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
              text: USER_PROMPTS
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