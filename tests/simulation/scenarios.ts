/**
 * Simulation scenarios for testing collaboration mechanics at scale
 *
 * Each scenario defines a collaboration type, participating personas,
 * and expected outcomes for validation.
 */

import { SimulationScenario } from './types';
import * as Personas from './personas';

// =============================================================================
// EASY SCENARIOS - Compatible constraints, should converge quickly
// =============================================================================

export const NEIGHBORHOOD_POTLUCK_EASY: SimulationScenario = {
  id: 'potluck-easy',
  name: 'Neighborhood Potluck - Easy',
  description: 'Casual potluck with mostly compatible constraints. Should find Saturday afternoon at accessible park with vegetarian and nut-free options.',

  collaboration: {
    outcome: 'Neighborhood potluck in the park',
    type: 'event',
    creator: 'sarah-veg'
  },

  personas: Personas.EASY_GROUP,

  difficulty: {
    level: 'easy',
    expectedRounds: 1,
    conflictTypes: ['no-conflict']
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.8,
    maxOptOuts: 1,
    constraintsSatisfied: [
      'Transit accessible location',
      'Vegetarian food options',
      'Nut-free or clearly labeled food',
      'Budget under $20-30 per person'
    ]
  }
};

export const WEEKEND_HIKE_EASY: SimulationScenario = {
  id: 'hike-easy',
  name: 'Weekend Hike - Easy Trails',
  description: 'Weekend hiking trip with physical constraints. Should find gentle trail with good views, dog-friendly.',

  collaboration: {
    outcome: 'Weekend hiking trip',
    type: 'trip',
    creator: 'morgan-call'
  },

  personas: [
    Personas.MORGAN_MORNING_CALL,
    Personas.ALEX_BAD_KNEES,
    Personas.CASEY_MOBILITY,
    Personas.JAMIE_FLEXIBLE,
    Personas.RILEY_PARENT
  ],

  difficulty: {
    level: 'easy',
    expectedRounds: 1,
    conflictTypes: ['no-conflict']
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.8,
    maxOptOuts: 1,
    constraintsSatisfied: [
      'Leave after 10am',
      'Accessible trails (no steep slopes)',
      'Back by 4pm',
      'Gentle activity'
    ]
  }
};

// =============================================================================
// MODERATE SCENARIOS - Some conflicts, should still converge
// =============================================================================

export const GROUP_DINNER_MODERATE: SimulationScenario = {
  id: 'dinner-moderate',
  name: 'Group Dinner - Budget vs Quality',
  description: 'Dinner with tension between budget constraints and quality desires. Should find mid-range restaurant with vegetarian options.',

  collaboration: {
    outcome: 'Group dinner at restaurant',
    type: 'event',
    creator: 'mike-budget'
  },

  personas: Personas.MODERATE_GROUP,

  difficulty: {
    level: 'moderate',
    expectedRounds: 2,
    conflictTypes: ['preference-conflict', 'coupling-conflict']
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.7,
    maxOptOuts: 1,
    constraintsSatisfied: [
      'Vegetarian options available',
      'Budget reasonable (under $30)',
      'Timing works for parent (back by specific time)',
      'Leave after 10am for work call'
    ]
  }
};

export const BEACH_DAY_MODERATE: SimulationScenario = {
  id: 'beach-moderate',
  name: 'Beach Day Trip - Timing Constraints',
  description: 'Day trip to beach with tight timing constraints. Should find nearby beach, leave right at 10am, back by 4pm.',

  collaboration: {
    outcome: 'Day trip to the beach',
    type: 'trip',
    creator: 'morgan-call'
  },

  personas: [
    Personas.MORGAN_MORNING_CALL,    // can't leave before 10am
    Personas.RILEY_PARENT,            // must be back by 4pm
    Personas.CASEY_MOBILITY,          // needs accessible beach
    Personas.SAM_TIGHT_BUDGET,        // limited budget
    Personas.JAMIE_FLEXIBLE
  ],

  difficulty: {
    level: 'moderate',
    expectedRounds: 1,
    conflictTypes: ['resource-conflict']  // time is limited
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.8,
    maxOptOuts: 0,
    constraintsSatisfied: [
      'Leave at/after 10am',
      'Back by 4pm',
      'Accessible facilities',
      'Within budget'
    ]
  }
};

// =============================================================================
// HARD SCENARIOS - Significant conflicts, may need multiple rounds
// =============================================================================

export const LAWN_MOWER_HARD: SimulationScenario = {
  id: 'lawnmower-hard',
  name: 'Shared Lawn Mower Purchase - Budget Conflict',
  description: 'Purchase shared lawn mower with conflicting budget/quality needs. Budget says $400, quality needs say $600+. Should surface tension.',

  collaboration: {
    outcome: 'Purchase shared lawn mower for neighborhood',
    type: 'project',
    creator: 'sam-budget'
  },

  personas: [
    Personas.SAM_TIGHT_BUDGET,        // needs under $400 total
    {
      ...Personas.ALEX_BAD_KNEES,
      id: 'alex-back',
      persistentConstraints: [
        {
          text: 'Must be self-propelled with mulching',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Bad back - cannot push heavy mower',
          flexibility: 0.0
        },
        {
          text: 'Quality brand that will last 10+ years',
          type: 'desire',
          intensity: 'would-love',
          reason: 'Values long-term investment',
          flexibility: 0.4
        }
      ]
    },
    Personas.JAMIE_FLEXIBLE,
    Personas.CHRIS_CARNIVORE  // just using as another person, constraints not relevant
  ],

  difficulty: {
    level: 'hard',
    expectedRounds: 2,
    conflictTypes: ['resource-conflict']
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.7,
    maxOptOuts: 1,
    constraintsSatisfied: [
      'Self-propelled with mulching (non-negotiable)'
      // Note: budget may need to adjust or quality expectations may need to lower
    ]
  }
};

export const RESTAURANT_HARD: SimulationScenario = {
  id: 'restaurant-hard',
  name: 'Group Dinner - Quality vs Budget Tension',
  description: 'Dinner with foodie wanting quality vs student needing cheap. Should find creative middle ground.',

  collaboration: {
    outcome: 'Group dinner downtown',
    type: 'event',
    creator: 'taylor-foodie'
  },

  personas: Personas.HARD_GROUP,

  difficulty: {
    level: 'hard',
    expectedRounds: 2,
    conflictTypes: ['preference-conflict', 'coupling-conflict']
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.6,
    maxOptOuts: 1,
    constraintsSatisfied: [
      'Vegetarian options available',
      'Meat options available',
      'Accessible facilities',
      'Within reasonable budget (may need to compromise)'
    ]
  }
};

export const SUSHI_CREATIVE: SimulationScenario = {
  id: 'sushi-creative',
  name: 'Sushi Dinner - Creative Resolution',
  description: 'One person wants sushi, another can\'t eat raw fish. Should find sushi restaurant with cooked options or creative alternative.',

  collaboration: {
    outcome: 'Group dinner for friends',
    type: 'event',
    creator: 'alex-knees'
  },

  personas: [
    {
      id: 'alex-sushi',
      name: 'Alex',
      demographics: {
        ageRange: '30s',
        lifestage: 'young professional',
        location: 'urban'
      },
      persistentConstraints: [
        {
          text: 'Wants sushi',
          type: 'desire',
          intensity: 'would-love',
          reason: 'Been craving sushi all week',
          flexibility: 0.4
        }
      ],
      personality: {
        flexibility: 0.6,
        assertiveness: 0.6,
        detailOrientation: 0.6,
        socialStyle: 'direct'
      },
      communication: {
        verbosity: 'moderate',
        emotionality: 'moderate',
        examplePhrases: ["I've been craving sushi", "Can we do sushi?"]
      }
    },
    {
      id: 'jordan-no-raw',
      name: 'Jordan',
      demographics: {
        ageRange: '30s',
        lifestage: 'young professional',
        location: 'urban'
      },
      persistentConstraints: [
        {
          text: 'No raw fish - makes me sick',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Food intolerance - raw fish makes them sick',
          flexibility: 0.0
        },
        {
          text: 'Likes Asian food',
          type: 'desire',
          intensity: 'would-like',
          reason: 'Enjoys Asian cuisine',
          flexibility: 0.7
        }
      ],
      personality: {
        flexibility: 0.6,
        assertiveness: 0.5,
        detailOrientation: 0.7,
        socialStyle: 'diplomatic'
      },
      communication: {
        verbosity: 'moderate',
        emotionality: 'moderate',
        examplePhrases: ["I can't eat raw fish - it makes me sick", "I do like Asian food though"]
      }
    },
    Personas.SAM_TIGHT_BUDGET,
    Personas.JAMIE_FLEXIBLE
  ],

  difficulty: {
    level: 'moderate',
    expectedRounds: 1,
    conflictTypes: ['preference-conflict']
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.8,
    maxOptOuts: 0,
    constraintsSatisfied: [
      'No raw fish for Jordan',
      'Budget under $15-20',
      'Some form of sushi/Asian experience for Alex'
    ]
  }
};

// =============================================================================
// IMPOSSIBLE SCENARIOS - Should correctly identify and handle
// =============================================================================

export const VEGAN_VS_CARNIVORE_IMPOSSIBLE: SimulationScenario = {
  id: 'vegan-carnivore-impossible',
  name: 'Team Dinner - Impossible Dietary Conflict',
  description: 'Vegan-only restaurant vs must-have-steak. Fundamentally incompatible. Should recognize impossibility and suggest alternatives (separate dinners, food hall, compromise).',

  collaboration: {
    outcome: 'Team celebration dinner',
    type: 'event',
    creator: 'pat-vegan'
  },

  personas: Personas.IMPOSSIBLE_GROUP,

  difficulty: {
    level: 'impossible',
    expectedRounds: 1,
    conflictTypes: ['value-conflict']
  },

  success: {
    convergenceExpected: false,  // This SHOULD NOT converge to one restaurant
    minAcceptanceRate: 0.0,
    maxOptOuts: 3,
    constraintsSatisfied: [
      // None - the constraints are mutually exclusive
    ]
  }
};

// =============================================================================
// SCALE SCENARIOS - Testing with many participants
// =============================================================================

export const LARGE_POTLUCK: SimulationScenario = {
  id: 'potluck-large-10',
  name: 'Large Potluck - 10 Participants',
  description: 'Potluck with 10 people. Tests scaling, deduplication, and synthesis with many constraints.',

  collaboration: {
    outcome: 'Community potluck',
    type: 'event',
    creator: 'sarah-veg'
  },

  personas: [
    Personas.SARAH_VEGETARIAN,
    Personas.JORDAN_ALLERGY,
    Personas.MIKE_BUDGET,
    Personas.SAM_TIGHT_BUDGET,
    Personas.RILEY_PARENT,
    Personas.MORGAN_MORNING_CALL,
    Personas.CASEY_MOBILITY,
    Personas.ALEX_BAD_KNEES,
    Personas.JAMIE_FLEXIBLE,
    Personas.TAYLOR_FOODIE
  ],

  difficulty: {
    level: 'moderate',
    expectedRounds: 2,
    conflictTypes: ['preference-conflict', 'coupling-conflict']
  },

  success: {
    convergenceExpected: true,
    minAcceptanceRate: 0.7,
    maxOptOuts: 2,
    constraintsSatisfied: [
      'Transit accessible',
      'Vegetarian options',
      'Nut-free labeling',
      'Accessible facilities',
      'Budget-friendly'
    ]
  }
};

// =============================================================================
// ALL SCENARIOS
// =============================================================================

export const ALL_SCENARIOS: SimulationScenario[] = [
  // Easy
  NEIGHBORHOOD_POTLUCK_EASY,
  WEEKEND_HIKE_EASY,

  // Moderate
  GROUP_DINNER_MODERATE,
  BEACH_DAY_MODERATE,
  SUSHI_CREATIVE,

  // Hard
  LAWN_MOWER_HARD,
  RESTAURANT_HARD,

  // Impossible
  VEGAN_VS_CARNIVORE_IMPOSSIBLE,

  // Scale
  LARGE_POTLUCK
];

export const SCENARIOS_BY_DIFFICULTY = {
  easy: [NEIGHBORHOOD_POTLUCK_EASY, WEEKEND_HIKE_EASY],
  moderate: [GROUP_DINNER_MODERATE, BEACH_DAY_MODERATE, SUSHI_CREATIVE],
  hard: [LAWN_MOWER_HARD, RESTAURANT_HARD],
  impossible: [VEGAN_VS_CARNIVORE_IMPOSSIBLE],
  scale: [LARGE_POTLUCK]
};
