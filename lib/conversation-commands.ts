export type CommandType =
  | 'generate'
  | 'edit'
  | 'regenerate'
  | 'publish'
  | 'approve'
  | 'cancel'
  | 'unknown';

export interface ParsedCommand {
  type: CommandType;
  intent: string;
  parameters?: Record<string, unknown>;
  confidence: number;
}

const COMMAND_PATTERNS: Record<CommandType, RegExp[]> = {
  generate: [
    /^(create|generate|write) /i,
    /^(let's|lets) (create|make|start)/i,
    /^make (a|an|some) /i,
    /^start /i,
  ],
  edit: [
    /^make it (more |less )?(spicy|spicier|casual|professional|funny)/i,
    /^(change|edit|update|modify) /i,
    /^(more|less) (spicy|spicier|casual|professional|funny)/i,
    /^(change|swap|replace) (the )?(image|photo|picture)/i,
  ],
  regenerate: [
    /^(try again|regenerate|start over|redo)/i,
    /(don't like it|not good|i don't like)/i,
  ],
  publish: [/^(publish|post|share|send)/i, /^(put it on|post (it )?to|share (it )?on)/i],
  approve: [
    /^(perfect|love it|looks? good|great|awesome)/i,
    /^(yes|yeah|yep|sure|ok|okay)/i,
    /^(let's publish|ready to publish)/i,
  ],
  cancel: [/^(cancel|stop|never ?mind|forget it)/i, /^(don't (publish|post|share))/i],
  unknown: [],
};

export function parseCommand(input: string): ParsedCommand {
  const normalizedInput = input.trim();
  const orderedCommandTypes: CommandType[] = [
    'regenerate',
    'edit',
    'approve',
    'cancel',
    'publish',
    'generate',
    'unknown',
  ];

  for (const commandType of orderedCommandTypes) {
    const patterns = COMMAND_PATTERNS[commandType];
    for (const pattern of patterns) {
      if (pattern.test(normalizedInput)) {
        return {
          type: commandType,
          intent: normalizedInput,
          confidence: 0.9,
        };
      }
    }
  }

  return {
    type: 'unknown',
    intent: normalizedInput,
    confidence: 0.3,
  };
}
