/**
 * Library of diverse personas for simulation testing
 *
 * These personas create realistic constraint patterns that test
 * different aspects of the collaboration system.
 */

import { Persona } from './types';

// =============================================================================
// DIETARY/FOOD PERSONAS
// =============================================================================

export const SARAH_VEGETARIAN: Persona = {
  id: 'sarah-veg',
  name: 'Sarah',
  demographics: {
    ageRange: '30s',
    lifestage: 'young professional',
    location: 'urban'
  },
  persistentConstraints: [
    {
      text: 'Vegetarian food options required',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Ethical dietary restriction - has been vegetarian for 10 years',
      flexibility: 0.0
    },
    {
      text: 'Transit accessible location',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Does not own a car, relies on public transit',
      flexibility: 0.1
    },
    {
      text: 'Afternoon timing preferred',
      type: 'desire',
      intensity: 'would-like',
      reason: 'Works mornings, prefers afternoon activities',
      flexibility: 0.6
    }
  ],
  personality: {
    flexibility: 0.4,
    assertiveness: 0.6,
    detailOrientation: 0.7,
    socialStyle: 'direct'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'moderate',
    examplePhrases: [
      "I don't eat meat, so we'd need vegetarian options",
      "I need somewhere I can get to by bus",
      "Afternoons work better for me",
      "That could work as long as there's something I can eat"
    ]
  }
};

export const JORDAN_ALLERGY: Persona = {
  id: 'jordan-allergy',
  name: 'Jordan',
  demographics: {
    ageRange: '20s',
    lifestage: 'young professional',
    location: 'urban'
  },
  persistentConstraints: [
    {
      text: 'Nut-free food or clear allergen labeling',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Severe nut allergy - life-threatening',
      flexibility: 0.0
    },
    {
      text: 'Live music or entertainment',
      type: 'desire',
      intensity: 'would-love',
      reason: 'Appreciates music, knows local musicians',
      flexibility: 0.8
    }
  ],
  personality: {
    flexibility: 0.7,
    assertiveness: 0.5,
    detailOrientation: 0.8,
    socialStyle: 'diplomatic'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'expressive',
    examplePhrases: [
      "I have a severe nut allergy - it's actually life-threatening",
      "We'd need to make sure everything is labeled",
      "It would be amazing if we could have live music",
      "I'm pretty flexible otherwise"
    ]
  }
};

export const PAT_VEGAN: Persona = {
  id: 'pat-vegan',
  name: 'Pat',
  demographics: {
    ageRange: '30s',
    lifestage: 'young professional',
    location: 'urban'
  },
  persistentConstraints: [
    {
      text: 'Must be fully vegan restaurant',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Only eats at 100% vegan restaurants for ethical reasons',
      flexibility: 0.0
    }
  ],
  personality: {
    flexibility: 0.2,
    assertiveness: 0.7,
    detailOrientation: 0.8,
    socialStyle: 'direct'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'moderate',
    examplePhrases: [
      "I only eat at 100% vegan restaurants for ethical reasons",
      "I can't compromise on this - it's a core value",
      "Are there any fully vegan places nearby?"
    ]
  }
};

// =============================================================================
// BUDGET-CONSCIOUS PERSONAS
// =============================================================================

export const MIKE_BUDGET: Persona = {
  id: 'mike-budget',
  name: 'Mike',
  demographics: {
    ageRange: '30s',
    lifestage: 'young professional',
    location: 'suburban'
  },
  persistentConstraints: [
    {
      text: 'Keep costs reasonable - under $20-30 per person',
      type: 'concern',
      severity: 'preference',
      reason: 'Budget-conscious but not broke',
      flexibility: 0.4
    },
    {
      text: 'Wants to bring homemade contribution',
      type: 'desire',
      intensity: 'would-love',
      reason: 'Enjoys cooking and sharing food',
      flexibility: 0.7
    }
  ],
  personality: {
    flexibility: 0.6,
    assertiveness: 0.5,
    detailOrientation: 0.5,
    socialStyle: 'diplomatic'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'moderate',
    examplePhrases: [
      "I'd like to keep costs reasonable - maybe under $20?",
      "I make a killer chili I'd love to bring",
      "That's a bit pricey for me, can we find something cheaper?",
      "I'm happy to contribute food instead of money"
    ]
  }
};

export const SAM_TIGHT_BUDGET: Persona = {
  id: 'sam-budget',
  name: 'Sam',
  demographics: {
    ageRange: '20s',
    lifestage: 'student',
    location: 'urban'
  },
  persistentConstraints: [
    {
      text: 'Budget under $15 per person',
      type: 'concern',
      severity: 'strong-preference',
      reason: 'Student on tight budget',
      flexibility: 0.2
    },
    {
      text: 'Simple, casual atmosphere',
      type: 'desire',
      intensity: 'would-like',
      reason: 'Prefers low-key activities',
      flexibility: 0.7
    }
  ],
  personality: {
    flexibility: 0.5,
    assertiveness: 0.4,
    detailOrientation: 0.6,
    socialStyle: 'passive'
  },
  communication: {
    verbosity: 'terse',
    emotionality: 'reserved',
    examplePhrases: [
      "I'm on a tight budget this month",
      "Can we keep it cheap?",
      "That's too expensive for me",
      "I'm fine with whatever as long as it's affordable"
    ]
  }
};

// =============================================================================
// TIME-CONSTRAINED PERSONAS
// =============================================================================

export const RILEY_PARENT: Persona = {
  id: 'riley-parent',
  name: 'Riley',
  demographics: {
    ageRange: '30s',
    lifestage: 'parent',
    location: 'suburban'
  },
  persistentConstraints: [
    {
      text: 'Must be back by specific time for childcare',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Has childcare responsibilities - picking up kid',
      flexibility: 0.0
    },
    {
      text: 'Family-friendly environment',
      type: 'desire',
      intensity: 'would-like',
      reason: 'Prefers places they could bring kids in future',
      flexibility: 0.6
    }
  ],
  personality: {
    flexibility: 0.5,
    assertiveness: 0.6,
    detailOrientation: 0.8,
    socialStyle: 'direct'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'moderate',
    examplePhrases: [
      "I need to be back by 4pm to pick up my kid - that's non-negotiable",
      "As long as we're done by X time, I'm flexible",
      "Can we make sure this works with the timing?",
      "I'd prefer somewhere family-friendly"
    ]
  }
};

export const MORGAN_MORNING_CALL: Persona = {
  id: 'morgan-call',
  name: 'Morgan',
  demographics: {
    ageRange: '30s',
    lifestage: 'young professional',
    location: 'urban'
  },
  persistentConstraints: [
    {
      text: 'Cannot leave before 10am due to work call',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Has recurring work commitment',
      flexibility: 0.0
    },
    {
      text: 'Wants active outdoor activity',
      type: 'desire',
      intensity: 'would-love',
      reason: 'Loves being outside and active',
      flexibility: 0.5
    }
  ],
  personality: {
    flexibility: 0.6,
    assertiveness: 0.7,
    detailOrientation: 0.7,
    socialStyle: 'direct'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'moderate',
    examplePhrases: [
      "I have a work call until 10am that I can't move",
      "We'd need to leave after 10",
      "I'd love to do something outdoorsy and active",
      "Can we make sure we actually get outside?"
    ]
  }
};

// =============================================================================
// PHYSICAL CONSTRAINT PERSONAS
// =============================================================================

export const CASEY_MOBILITY: Persona = {
  id: 'casey-mobility',
  name: 'Casey',
  demographics: {
    ageRange: '40s',
    lifestage: 'professional',
    location: 'suburban'
  },
  persistentConstraints: [
    {
      text: 'Accessible facilities required',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Uses wheelchair - needs accessibility',
      flexibility: 0.0
    },
    {
      text: 'Covered/indoor option for weather',
      type: 'desire',
      intensity: 'would-like',
      reason: 'Prefers weather-protected options',
      flexibility: 0.5
    }
  ],
  personality: {
    flexibility: 0.6,
    assertiveness: 0.7,
    detailOrientation: 0.9,
    socialStyle: 'direct'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'moderate',
    examplePhrases: [
      "I use a wheelchair so we'd need somewhere accessible",
      "Are there accessible restrooms?",
      "Can we make sure there's level access?",
      "It would be nice to have a covered area"
    ]
  }
};

export const ALEX_BAD_KNEES: Persona = {
  id: 'alex-knees',
  name: 'Alex',
  demographics: {
    ageRange: '40s',
    lifestage: 'professional',
    location: 'suburban'
  },
  persistentConstraints: [
    {
      text: 'Avoid steep trails or lots of stairs',
      type: 'concern',
      severity: 'strong-preference',
      reason: 'Bad knees - can do light activity but not intense',
      flexibility: 0.3
    },
    {
      text: 'Scenic views or nature',
      type: 'desire',
      intensity: 'would-love',
      reason: 'Appreciates nature and beautiful settings',
      flexibility: 0.7
    }
  ],
  personality: {
    flexibility: 0.7,
    assertiveness: 0.5,
    detailOrientation: 0.6,
    socialStyle: 'diplomatic'
  },
  communication: {
    verbosity: 'moderate',
    emotionality: 'moderate',
    examplePhrases: [
      "I have bad knees so nothing too steep",
      "I can do light hiking but not intense",
      "Would love somewhere with a nice view",
      "As long as it's not too strenuous I'm good"
    ]
  }
};

// =============================================================================
// PREFERENCE/STYLE PERSONAS
// =============================================================================

export const TAYLOR_FOODIE: Persona = {
  id: 'taylor-foodie',
  name: 'Taylor',
  demographics: {
    ageRange: '30s',
    lifestage: 'young professional',
    location: 'urban'
  },
  persistentConstraints: [
    {
      text: 'High-quality, interesting food',
      type: 'desire',
      intensity: 'would-love',
      reason: 'Food enthusiast, values culinary experiences',
      flexibility: 0.4
    },
    {
      text: 'Willing to spend more for quality',
      type: 'desire',
      intensity: 'would-like',
      reason: 'Prioritizes experience over cost',
      flexibility: 0.6
    }
  ],
  personality: {
    flexibility: 0.5,
    assertiveness: 0.6,
    detailOrientation: 0.8,
    socialStyle: 'direct'
  },
  communication: {
    verbosity: 'verbose',
    emotionality: 'expressive',
    examplePhrases: [
      "I'd love somewhere with really good food",
      "I'm happy to spend a bit more if the quality is there",
      "Can we find somewhere known for their cuisine?",
      "I'd rather do something special than just ok"
    ]
  }
};

export const CHRIS_CARNIVORE: Persona = {
  id: 'chris-carnivore',
  name: 'Chris',
  demographics: {
    ageRange: '30s',
    lifestage: 'young professional',
    location: 'suburban'
  },
  persistentConstraints: [
    {
      text: 'Must have substantial meat options',
      type: 'concern',
      severity: 'non-negotiable',
      reason: 'Carnivore diet for health reasons - needs steak/meat',
      flexibility: 0.0
    }
  ],
  personality: {
    flexibility: 0.3,
    assertiveness: 0.7,
    detailOrientation: 0.6,
    socialStyle: 'direct'
  },
  communication: {
    verbosity: 'terse',
    emotionality: 'reserved',
    examplePhrases: [
      "I'm on a carnivore diet for health - I need to be able to order steak",
      "I can't do vegetarian restaurants",
      "Need somewhere with good meat options",
      "As long as they have steak I'm good"
    ]
  }
};

export const JAMIE_FLEXIBLE: Persona = {
  id: 'jamie-flexible',
  name: 'Jamie',
  demographics: {
    ageRange: '20s',
    lifestage: 'young professional',
    location: 'urban'
  },
  persistentConstraints: [
    {
      text: 'Open to anything',
      type: 'desire',
      intensity: 'nice-to-have',
      reason: 'Easy-going, no strong preferences',
      flexibility: 0.9
    }
  ],
  personality: {
    flexibility: 0.9,
    assertiveness: 0.3,
    detailOrientation: 0.4,
    socialStyle: 'passive'
  },
  communication: {
    verbosity: 'terse',
    emotionality: 'reserved',
    examplePhrases: [
      "I'm flexible, whatever works for everyone else",
      "Yeah sure, sounds good",
      "I can chip in",
      "No strong preferences"
    ]
  }
};

// =============================================================================
// PERSONA SETS FOR DIFFERENT TEST SCENARIOS
// =============================================================================

/**
 * Easy scenario - mostly compatible constraints
 */
export const EASY_GROUP = [
  SARAH_VEGETARIAN,
  MIKE_BUDGET,
  JORDAN_ALLERGY,
  JAMIE_FLEXIBLE,
  ALEX_BAD_KNEES
];

/**
 * Moderate scenario - some conflicts but resolvable
 */
export const MODERATE_GROUP = [
  SARAH_VEGETARIAN,
  TAYLOR_FOODIE,
  SAM_TIGHT_BUDGET,
  RILEY_PARENT,
  MORGAN_MORNING_CALL
];

/**
 * Hard scenario - significant budget/quality tension
 */
export const HARD_GROUP = [
  TAYLOR_FOODIE,          // wants quality, willing to spend
  SAM_TIGHT_BUDGET,       // needs cheap
  CHRIS_CARNIVORE,        // needs meat
  SARAH_VEGETARIAN,       // needs vegetarian
  CASEY_MOBILITY          // needs accessibility
];

/**
 * Impossible scenario - fundamentally incompatible constraints
 */
export const IMPOSSIBLE_GROUP = [
  PAT_VEGAN,              // must be 100% vegan restaurant
  CHRIS_CARNIVORE,        // must have steak
  TAYLOR_FOODIE           // wants high quality (makes compromise harder)
];

// =============================================================================
// EXPORTS
// =============================================================================

export const ALL_PERSONAS = [
  SARAH_VEGETARIAN,
  JORDAN_ALLERGY,
  PAT_VEGAN,
  MIKE_BUDGET,
  SAM_TIGHT_BUDGET,
  RILEY_PARENT,
  MORGAN_MORNING_CALL,
  CASEY_MOBILITY,
  ALEX_BAD_KNEES,
  TAYLOR_FOODIE,
  CHRIS_CARNIVORE,
  JAMIE_FLEXIBLE
];

export const PERSONA_GROUPS = {
  easy: EASY_GROUP,
  moderate: MODERATE_GROUP,
  hard: HARD_GROUP,
  impossible: IMPOSSIBLE_GROUP
};
