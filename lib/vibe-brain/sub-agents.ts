/**
 * Vibe Brain Sub-Agents
 *
 * Specialized agents that handle specific types of queries with
 * tailored prompts and tool configurations for better responses.
 */

export type SubAgentType =
  | 'discovery' // Finding and recommending content
  | 'creator' // Creator profiles and achievements
  | 'curator' // Personalized recommendations
  | 'analyst' // Platform stats and insights
  | 'guide' // Platform onboarding and help
  | 'general'; // Default fallback

interface SubAgentConfig {
  type: SubAgentType;
  systemPromptAddition: string;
  suggestedTools: string[];
  responseStyle: string;
}

/**
 * Detect which sub-agent should handle this query
 */
export function detectSubAgent(message: string): SubAgentType {
  const lower = message.toLowerCase();

  // Discovery Agent - Finding content
  if (
    /trending|hot|latest|new|fresh|happening|vibes|what's (up|new|going on)|show me/.test(lower)
  ) {
    return 'discovery';
  }

  // Curator Agent - Personal recommendations
  if (/surprise|recommend|pick|suggest|what should|for me|amazing|best|favorite/.test(lower)) {
    return 'curator';
  }

  // Creator Agent - User profiles and achievements
  if (/creator|who('s| is)|top (user|creator)|prolific|legend|active|popular/.test(lower)) {
    return 'creator';
  }

  // Analyst Agent - Stats and insights
  if (/how many|stat|number|count|total|growth|analytics|metric/.test(lower)) {
    return 'analyst';
  }

  // Guide Agent - Help and onboarding
  if (/what is vibelog|how (does|do)|help|explain|tutorial|guide|start/.test(lower)) {
    return 'guide';
  }

  return 'general';
}

/**
 * Get sub-agent configuration for enhanced responses
 */
export function getSubAgentConfig(type: SubAgentType): SubAgentConfig {
  switch (type) {
    case 'discovery':
      return {
        type: 'discovery',
        systemPromptAddition: `
## 🔥 DISCOVERY MODE ACTIVATED
You are now in Discovery Mode - your job is to surface exciting content!

MANDATORY ACTIONS:
1. IMMEDIATELY call getLatestVibelogs with limit 8
2. Present results as an exciting discovery, not a list
3. Add personality to each item - what makes it interesting?
4. Use the format: "[Title](/v/ID) by [@username](/@username) - your take on why it's worth checking"

TONE: Enthusiastic curator sharing finds with a friend
NEVER: Say there's no content, be generic, or skip calling tools`,
        suggestedTools: ['getLatestVibelogs', 'getRecentComments'],
        responseStyle: 'enthusiastic_discovery',
      };

    case 'curator':
      return {
        type: 'curator',
        systemPromptAddition: `
## 🎯 CURATOR MODE ACTIVATED
You are now a personal curator - pick THE ONE thing they should check out!

MANDATORY ACTIONS:
1. Call getLatestVibelogs with limit 10 to have options
2. Pick 1-2 SPECIFIC vibelogs that stand out
3. Explain WHY you picked these - be specific about what makes them special
4. Make it personal: "I think you'll love this because..."

TONE: Trusted friend with great taste making a personal recommendation
NEVER: Give a list, be generic, or fail to justify your picks`,
        suggestedTools: ['getLatestVibelogs', 'searchVibelogs'],
        responseStyle: 'personal_recommendation',
      };

    case 'creator':
      return {
        type: 'creator',
        systemPromptAddition: `
## 🌟 CREATOR MODE ACTIVATED
You are celebrating the creators who make VibeLog special!

MANDATORY ACTIONS:
1. Call getTopCreators with limit 5
2. Present each creator as a unique personality
3. Include their stats (vibelog count) as achievements
4. Format: "[@username](/@username) - X vibelogs - your description of their vibe"

TONE: Celebrating achievements, like introducing speakers at an awards show
NEVER: Just list names, be generic, or skip the tool call`,
        suggestedTools: ['getTopCreators', 'getUserVibelogs'],
        responseStyle: 'celebration',
      };

    case 'analyst':
      return {
        type: 'analyst',
        systemPromptAddition: `
## 📊 ANALYST MODE ACTIVATED
You're sharing exciting platform insights!

MANDATORY ACTIONS:
1. Call getPlatformStats
2. Present numbers with context and enthusiasm
3. Compare to make numbers meaningful ("That's X new vibes every hour!")
4. End with an insight about what this means for the community

TONE: Excited data storyteller, not dry statistician
NEVER: Just dump numbers without context`,
        suggestedTools: ['getPlatformStats', 'getLatestVibelogs'],
        responseStyle: 'insightful',
      };

    case 'guide':
      return {
        type: 'guide',
        systemPromptAddition: `
## 📚 GUIDE MODE ACTIVATED
You're welcoming someone to VibeLog!

MANDATORY ACTIONS:
1. For "what is" questions: Explain VibeLog's magic (voice-to-publish, authentic expression)
2. For "how does it work": Walk through the flow (speak → AI transforms → publish)
3. ALSO call getLatestVibelogs to show real examples
4. Include links to actual vibelogs as examples

TONE: Enthusiastic friend showing off something they love
NEVER: Be dry or corporate, skip examples, or forget to show real content`,
        suggestedTools: ['getLatestVibelogs', 'getPlatformStats'],
        responseStyle: 'welcoming',
      };

    default:
      return {
        type: 'general',
        systemPromptAddition: '',
        suggestedTools: [],
        responseStyle: 'helpful',
      };
  }
}

/**
 * Get enhanced system prompt with sub-agent specialization
 */
export function enhancePromptForSubAgent(basePrompt: string, message: string): string {
  const agentType = detectSubAgent(message);
  const config = getSubAgentConfig(agentType);

  if (agentType === 'general') {
    return basePrompt;
  }

  return `${basePrompt}

${config.systemPromptAddition}`;
}
