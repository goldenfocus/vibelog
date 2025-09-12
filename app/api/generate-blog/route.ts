import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    console.log('Generating blog from transcription:', transcription.substring(0, 100) + '...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are VibeLog's AI content creator. Transform voice recordings into engaging, professional blog posts.

Guidelines:
- CRITICAL: Detect the language of the input transcription and respond 100% in the SAME language
- If input is Chinese, write EVERYTHING in Chinese including title and all content
- If input is Spanish, write EVERYTHING in Spanish including title and all content  
- If input is German, write EVERYTHING in German including title and all content
- Never mix languages - title and content must be in the same language as input
- Create compelling headlines and subheadings
- Structure content with clear paragraphs
- Add insights and polish the ideas
- Maintain the speaker's voice and personality
- Make it shareable and engaging
- Include relevant hashtags or keywords
- Format for web reading (short paragraphs, bullet points when appropriate)

IMPORTANT FORMATTING RULES:
- TITLE AND ALL CONTENT must be in the same language as the input transcription
- Format the title as a proper H1 heading: # Title Here (not **Title** or **Titre**)
- Use clean markdown formatting without prefixes like "**Titre:" or "**Title:"
- Start directly with the # heading, no other prefixes
- Use proper heading hierarchy: # for main title, ## for sections, ### for subsections

Format the output as a complete blog post ready for publishing.`
        },
        {
          role: 'user',
          content: `Please transform this voice recording into a polished blog post:

"${transcription}"

Make it engaging, well-structured, and ready to publish. Add a compelling title and organize the content with clear sections.`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const blogContent = completion.choices[0]?.message?.content || '';

    console.log('Blog generation completed:', blogContent.substring(0, 100) + '...');

    return NextResponse.json({ 
      blogContent,
      success: true 
    });

  } catch (error) {
    console.error('Blog generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate blog content' }, 
      { status: 500 }
    );
  }
}