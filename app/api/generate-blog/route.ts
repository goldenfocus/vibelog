import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    console.log('Generating blog from transcription:', transcription.substring(0, 100) + '...');

    // Check if we have a real API key, otherwise return mock response for testing
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key') {
      console.log('🧪 Using mock blog generation for development/testing');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      return NextResponse.json({ 
        blogContent: `# The Future of Voice Technology: Transforming Content Creation

Voice technology is revolutionizing how we create and share content. As we move toward a more connected digital world, the ability to transform spoken words into polished, publishable content represents a fundamental shift in content creation.

## The Natural Evolution of Communication

Speaking is our most natural form of communication. When we remove the friction of typing and formatting, we can focus purely on our ideas and let technology handle the rest. This liberation allows creators to:

- **Express ideas more naturally** without the constraints of a keyboard
- **Capture inspiration in real-time** wherever they are
- **Reduce the barrier between thought and publication**

## Why Voice Matters in Content Creation

The implications for creators, writers, and content marketers are profound. We're moving toward a world where your voice becomes your pen, enabling:

### Faster Content Production
Voice-to-text technology can capture thoughts at the speed of speech, which is typically 3-4 times faster than typing.

### Improved Accessibility
Voice interfaces make content creation accessible to users with mobility challenges or those who prefer auditory interaction.

### Enhanced Authenticity
Content created through voice often retains a more conversational, authentic tone that resonates better with audiences.

## The Technology Behind the Magic

Modern voice technology combines several cutting-edge technologies:

- **Advanced speech recognition** powered by neural networks
- **Natural language processing** for context understanding
- **AI-driven content optimization** for SEO and readability
- **Automated formatting and structuring** for professional presentation

## Looking Forward

As voice technology continues to evolve, we can expect even more sophisticated features like real-time fact-checking, automatic citation generation, and multi-language content creation. The future of content creation is not just digital—it's conversational.

*Ready to try voice-powered content creation? Start speaking your ideas into existence today.*`
      });
    }

    // Initialize OpenAI client only when we have a real API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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