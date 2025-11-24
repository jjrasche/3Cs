/**
 * All test scenarios in one data-driven file
 *
 * Add new scenarios here - the framework will automatically pick them up
 */

import {
  TestScenario,
  BriefingInput,
  ExtractionInput,
  SynthesisInput,
  ContextualizationInput,
  QuestionIdentificationInput
} from './types';

// =============================================================================
// BRIEFING SCENARIOS
// =============================================================================

export const BRIEFING_SCENARIOS: TestScenario<BriefingInput, any>[] = [
  {
    id: "briefing-trip-planning-happy",
    name: "Trip Planning - New Joiner with Profile",
    description: "New person joins trip planning with relevant profile constraints",
    promptType: "briefing",
    edgeCaseType: "happy-path",
    input: {
      collaboration: {
        id: "collab-003",
        outcome: "Weekend camping trip to state park",
        creator: "Morgan",
        participants: [
          { id: "p1", name: "Morgan" },
          { id: "p2", name: "Riley" }
        ],
        constraints: [
          {
            text: "Must have accessible restroom facilities",
            anonymous: false,
            participantId: "p2"
          }
        ],
        when: "Weekend of March 15-16",
        where: undefined
      },
      participant: {
        id: "p3",
        name: "Taylor",
        learnedConstraints: [
          "Vegetarian dietary restriction",
          "Prefers morning activities",
          "Has seasonal allergies"
        ]
      }
    },
    expectedBehavior: [
      "Explain what the trip is about and current state",
      "Mention who's involved (Morgan and Riley)",
      "Note what's decided (when) and what's open (where)",
      "Reference Taylor's profile - especially vegetarian for meal planning",
      "Mention allergies may be relevant for outdoor camping",
      "Warm, concierge tone - not robotic"
    ]
  },
  {
    id: "briefing-dinner-minimal-profile",
    name: "Casual Dinner - New User No Profile",
    description: "First-time user joining dinner with no learned constraints",
    promptType: "briefing",
    edgeCaseType: "happy-path",
    input: {
      collaboration: {
        id: "collab-005",
        outcome: "Group dinner at a restaurant downtown",
        creator: "Alex",
        participants: [
          { id: "p1", name: "Alex" },
          { id: "p2", name: "Sam" }
        ],
        constraints: [],
        when: "Friday evening",
        where: undefined
      },
      participant: {
        id: "p3",
        name: "Casey",
        learnedConstraints: []
      }
    },
    expectedBehavior: [
      "Brief clearly without profile references",
      "Explain the dinner plan and who's involved",
      "Note that location is still being decided",
      "Encourage them to share what matters to them",
      "Don't assume any constraints"
    ]
  }
];

// =============================================================================
// EXTRACTION SCENARIOS
// =============================================================================

export const EXTRACTION_SCENARIOS: TestScenario<ExtractionInput, any>[] = [
  {
    id: "extraction-casual-dinner-happy",
    name: "Casual Dinner - Clear Preferences",
    description: "User expresses clear dietary restriction and time preference",
    promptType: "extraction",
    edgeCaseType: "happy-path",
    input: {
      collaboration: {
        id: "collab-001",
        outcome: "Group dinner at a restaurant downtown",
        creator: "Alex",
        participants: [
          { id: "p1", name: "Alex" },
          { id: "p2", name: "Jordan" }
        ],
        constraints: [],
        when: undefined,
        where: undefined
      },
      participant: {
        id: "p2",
        name: "Jordan"
      },
      conversationHistory: [],
      userMessage: "Sounds fun! I'm vegetarian so we'd need somewhere with good veggie options. Friday evening works best for me since I have early mornings the rest of the week."
    },
    expectedBehavior: [
      "Extract vegetarian as a concern with high severity (dietary restriction)",
      "Extract Friday evening as a desire with medium intensity",
      "Generate functional constraint wording like 'restaurant must have vegetarian options'",
      "Respond with appropriate follow-up or acknowledgment",
      "Signal should be 'deepen' or 'expand' to gather more info"
    ]
  },
  {
    id: "extraction-trip-multiple-concerns",
    name: "Trip Planning - Multiple Concerns",
    description: "User expresses several concerns and desires for a trip",
    promptType: "extraction",
    edgeCaseType: "happy-path",
    input: {
      collaboration: {
        id: "collab-006",
        outcome: "Weekend hiking trip",
        creator: "Pat",
        participants: [
          { id: "p1", name: "Pat" },
          { id: "p2", name: "Morgan" }
        ],
        constraints: [],
        when: "Next Saturday",
        where: undefined
      },
      participant: {
        id: "p2",
        name: "Morgan"
      },
      conversationHistory: [],
      userMessage: "I'm excited but I need to be back by 5pm for a dinner commitment. Also, I have bad knees so nothing too steep. Would love if there's a nice view at the top though!"
    },
    expectedBehavior: [
      "Extract time constraint (back by 5pm) as non-negotiable concern",
      "Extract knee issue as strong-preference concern",
      "Extract nice view as would-love desire",
      "Appropriately distinguish hard constraint (time) from preference (knees)",
      "Signal should be 'deepen' or 'expand'"
    ]
  },
  {
    id: "extraction-shared-equipment-vague",
    name: "Shared Equipment - Vague Input",
    description: "User provides minimal, vague input",
    promptType: "extraction",
    edgeCaseType: "edge-case",
    input: {
      collaboration: {
        id: "collab-002",
        outcome: "Purchase shared lawn mower for the neighborhood",
        creator: "Pat",
        participants: [
          { id: "p1", name: "Pat" },
          { id: "p2", name: "Sam" },
          { id: "p3", name: "Chris" }
        ],
        constraints: [
          {
            text: "Total budget must not exceed $800",
            anonymous: false,
            participantId: "p1"
          }
        ],
        when: undefined,
        where: undefined
      },
      participant: {
        id: "p3",
        name: "Chris"
      },
      conversationHistory: [],
      userMessage: "Yeah sure, I can chip in. Whatever works for everyone else is fine with me I guess."
    },
    expectedBehavior: [
      "Recognize this is minimal input - don't over-extract",
      "Maybe extract 'flexible on specifics' as low-intensity desire",
      "Signal should be 'expand' to ask about aspects they haven't mentioned (storage, usage frequency, brand preferences)",
      "Response should ask clarifying questions about new topics",
      "Do not invent concerns or desires not expressed"
    ]
  },
  {
    id: "extraction-event-life-threatening",
    name: "Event - Life-Threatening Allergy",
    description: "User mentions life-threatening condition that must become constraint",
    promptType: "extraction",
    edgeCaseType: "edge-case",
    input: {
      collaboration: {
        id: "collab-007",
        outcome: "Neighborhood potluck in the park",
        creator: "Sarah",
        participants: [
          { id: "p1", name: "Sarah" },
          { id: "p2", name: "Mike" },
          { id: "p3", name: "Jordan" }
        ],
        constraints: [],
        when: undefined,
        where: undefined
      },
      participant: {
        id: "p3",
        name: "Jordan"
      },
      conversationHistory: [],
      userMessage: "Count me in! I should mention I have a severe nut allergy - it's actually life-threatening so we'd need to make sure all food is labeled. On a happier note, it would be absolutely amazing if we could have some live music!"
    },
    expectedBehavior: [
      "Extract nut allergy as non-negotiable concern (life-threatening)",
      "Extract live music as would-love desire",
      "Recognize allergy should become a group constraint, not just personal concern",
      "Intensity should reflect language: 'life-threatening' = highest, 'amazing' = high desire",
      "Signal appropriately - might be 'complete' or 'deepen' on the allergy details"
    ]
  }
];

// =============================================================================
// SYNTHESIS SCENARIOS
// =============================================================================

export const SYNTHESIS_SCENARIOS: TestScenario<SynthesisInput, any>[] = [
  {
    id: "synthesis-event-potluck-happy",
    name: "Event - Neighborhood Potluck",
    description: "Synthesize proposals for potluck with multiple participants' constraints",
    promptType: "synthesis",
    edgeCaseType: "happy-path",
    input: {
      collaboration: {
        id: "collab-004",
        outcome: "Neighborhood potluck in the park",
        creator: "Sarah",
        participants: [
          {
            id: "p1",
            name: "Sarah",
            extraction: {
              tags: [
                {
                  text: "Location must be accessible by bus",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I don't have a car so wherever we do it needs to be on a bus line",
                  underlying: "transit access"
                },
                {
                  text: "Afternoon timing preferred",
                  type: "desire",
                  intensity: "would-like",
                  quote: "Afternoons work best for me since I work mornings",
                  underlying: "schedule compatibility"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p2",
            name: "Mike",
            extraction: {
              tags: [
                {
                  text: "Per-person contribution under $20",
                  type: "concern",
                  severity: "preference",
                  quote: "I'd like to keep costs reasonable - maybe everyone stays under $20",
                  underlying: "budget consciousness"
                },
                {
                  text: "Wants to bring homemade chili",
                  type: "desire",
                  intensity: "would-love",
                  quote: "I make a killer chili that I'd love to bring",
                  underlying: "contribution pride"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p3",
            name: "Jordan",
            extraction: {
              tags: [
                {
                  text: "All food must be clearly labeled for nut allergies",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I have a severe nut allergy - it's life-threatening",
                  underlying: "safety"
                },
                {
                  text: "Live music entertainment",
                  type: "desire",
                  intensity: "would-love",
                  quote: "It would be amazing if we could have live music - I know a guy",
                  underlying: "atmosphere enhancement"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p4",
            name: "Pat",
            extraction: {
              tags: [
                {
                  text: "Weekend timing preferred",
                  type: "desire",
                  intensity: "would-like",
                  quote: "Weekends are better for me",
                  underlying: "availability"
                },
                {
                  text: "Simple contribution like drinks",
                  type: "desire",
                  intensity: "nice-to-have",
                  quote: "I hope I can just bring drinks or something simple",
                  underlying: "low-effort participation"
                }
              ],
              message: "",
              signal: "complete"
            }
          }
        ],
        constraints: [
          {
            text: "All food must be clearly labeled for allergens",
            anonymous: false,
            participantId: "p3"
          }
        ],
        when: undefined,
        where: undefined
      }
    },
    expectedBehavior: [
      "Propose Saturday or Sunday afternoon (satisfies Sarah's afternoon + Pat's weekend)",
      "Propose specific park location on bus line (satisfies Sarah's non-negotiable)",
      "Address allergen labeling requirement (Jordan's non-negotiable)",
      "Validate Mike's chili and Pat's drinks as contributions",
      "Mention live music as optional enhancement from Jordan's desire",
      "Keep proposals specific and actionable",
      "Should achieve 'consensus through obviousness'"
    ]
  },
  {
    id: "synthesis-equipment-conflict",
    name: "Shared Equipment - Budget Conflict",
    description: "Constraints conflict - some want quality, others want cheap",
    promptType: "synthesis",
    edgeCaseType: "edge-case",
    input: {
      collaboration: {
        id: "collab-008",
        outcome: "Purchase shared lawn mower for the neighborhood",
        creator: "Pat",
        participants: [
          {
            id: "p1",
            name: "Pat",
            extraction: {
              tags: [
                {
                  text: "Total budget under $400",
                  type: "concern",
                  severity: "strong-preference",
                  quote: "I really can't afford more than $100 as my share",
                  underlying: "budget constraint"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p2",
            name: "Sam",
            extraction: {
              tags: [
                {
                  text: "Must be self-propelled with mulching",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I have a bad back, so it absolutely has to be self-propelled",
                  underlying: "physical limitation"
                },
                {
                  text: "Quality brand that will last",
                  type: "desire",
                  intensity: "would-love",
                  quote: "I'd love to get something that will last 10+ years",
                  underlying: "long-term value"
                }
              ],
              message: "",
              signal: "complete"
            }
          }
        ],
        constraints: [],
        when: undefined,
        where: undefined
      }
    },
    expectedBehavior: [
      "Identify the tension: self-propelled quality mowers cost more than $400",
      "Propose options with explicit tradeoffs",
      "Don't pretend a $400 mower satisfies quality desire",
      "Suggest resolutions: more participants to split cost, or adjust expectations",
      "Be honest about constraints that can't all be satisfied"
    ]
  },
  {
    id: "synthesis-dinner-creative-resolution",
    name: "Group Dinner - Creative Third Option",
    description: "Seemingly conflicting preferences that can be creatively resolved",
    promptType: "synthesis",
    edgeCaseType: "happy-path",
    input: {
      collaboration: {
        id: "collab-009",
        outcome: "Group dinner for 4 friends",
        creator: "Alex",
        participants: [
          {
            id: "p1",
            name: "Alex",
            extraction: {
              tags: [
                {
                  text: "Wants sushi",
                  type: "desire",
                  intensity: "would-love",
                  quote: "I've been craving sushi all week",
                  underlying: "specific cuisine craving"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p2",
            name: "Jordan",
            extraction: {
              tags: [
                {
                  text: "No raw fish",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I can't eat raw fish - it makes me sick",
                  underlying: "food intolerance"
                },
                {
                  text: "Asian cuisine preferred",
                  type: "desire",
                  intensity: "would-like",
                  quote: "I do like Asian food though",
                  underlying: "cuisine preference"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p3",
            name: "Sam",
            extraction: {
              tags: [
                {
                  text: "Budget under $30 per person",
                  type: "concern",
                  severity: "strong-preference",
                  quote: "I'm on a tight budget this month",
                  underlying: "financial constraint"
                }
              ],
              message: "",
              signal: "complete"
            }
          }
        ],
        constraints: [],
        when: "Friday evening",
        where: undefined
      }
    },
    expectedBehavior: [
      "Find creative solution: sushi restaurant with cooked options (tempura, teriyaki, cooked rolls)",
      "Address Jordan's non-negotiable (no raw fish) while satisfying Alex's sushi craving",
      "Suggest specific cooked sushi options Jordan could order",
      "Consider budget-friendly sushi places or lunch specials",
      "Achieve consensus through obviousness - everyone gets what they need"
    ]
  },
  {
    id: "synthesis-trip-timing-conflict",
    name: "Day Trip - Timing Constraints",
    description: "Multiple timing constraints that need careful coordination",
    promptType: "synthesis",
    edgeCaseType: "edge-case",
    input: {
      collaboration: {
        id: "collab-010",
        outcome: "Day trip to the beach",
        creator: "Morgan",
        participants: [
          {
            id: "p1",
            name: "Morgan",
            extraction: {
              tags: [
                {
                  text: "Must leave after 10am",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I have a work call until 10am that I can't move",
                  underlying: "work commitment"
                },
                {
                  text: "Wants to swim",
                  type: "desire",
                  intensity: "would-love",
                  quote: "I really want to actually get in the water",
                  underlying: "beach activity"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p2",
            name: "Riley",
            extraction: {
              tags: [
                {
                  text: "Must be back by 4pm",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I'm picking up my kid at 4pm, non-negotiable",
                  underlying: "childcare responsibility"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p3",
            name: "Casey",
            extraction: {
              tags: [
                {
                  text: "Beach must be within 1 hour drive",
                  type: "concern",
                  severity: "strong-preference",
                  quote: "I get carsick on long drives",
                  underlying: "travel comfort"
                },
                {
                  text: "Wants to bring dog",
                  type: "desire",
                  intensity: "would-like",
                  quote: "It would be nice to bring my dog",
                  underlying: "pet inclusion"
                }
              ],
              message: "",
              signal: "complete"
            }
          }
        ],
        constraints: [],
        when: "This Saturday",
        where: undefined
      }
    },
    expectedBehavior: [
      "Calculate time window: leave after 10am, back by 4pm = 6 hours total",
      "With 1hr drive each way, only 4 hours at beach - note this is tight",
      "Propose specific nearby beach that's dog-friendly",
      "Acknowledge the timing is tight but workable",
      "Suggest leaving right at 10am to maximize beach time"
    ]
  },
  {
    id: "synthesis-event-three-way-conflict",
    name: "Team Event - Three Non-Negotiables Conflict",
    description: "Three different non-negotiables that may not all be satisfiable",
    promptType: "synthesis",
    edgeCaseType: "edge-case",
    input: {
      collaboration: {
        id: "collab-011",
        outcome: "Team celebration dinner",
        creator: "Pat",
        participants: [
          {
            id: "p1",
            name: "Pat",
            extraction: {
              tags: [
                {
                  text: "Must be fully vegan restaurant",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I only eat at 100% vegan restaurants for ethical reasons",
                  underlying: "ethical dietary requirement"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p2",
            name: "Chris",
            extraction: {
              tags: [
                {
                  text: "Must have steak option",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I'm on a carnivore diet for health, I need to be able to order steak",
                  underlying: "health dietary requirement"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p3",
            name: "Taylor",
            extraction: {
              tags: [
                {
                  text: "Must be downtown location",
                  type: "concern",
                  severity: "strong-preference",
                  quote: "I don't have a car so it needs to be downtown where I can walk",
                  underlying: "transportation limitation"
                }
              ],
              message: "",
              signal: "complete"
            }
          }
        ],
        constraints: [],
        when: "Next Friday",
        where: undefined
      }
    },
    expectedBehavior: [
      "Identify the fundamental conflict: vegan-only restaurant cannot serve steak",
      "These two non-negotiables are mutually exclusive",
      "Do NOT propose a fake solution",
      "Suggest alternatives: separate dinners, food hall with both options, or one person adjusts",
      "Be honest that this specific combination cannot be satisfied at one restaurant"
    ]
  }
];

// =============================================================================
// CONTEXTUALIZATION SCENARIOS
// =============================================================================

export const CONTEXTUALIZATION_SCENARIOS: TestScenario<ContextualizationInput, any>[] = [
  {
    id: "contextualization-proposal-fit-happy",
    name: "Proposal Fits Well",
    description: "Contextualize a proposal that fits participant's constraints well",
    promptType: "contextualization",
    edgeCaseType: "happy-path",
    input: {
      proposal: {
        question: "When and where should we hold the potluck?",
        proposal: "Saturday afternoon at Riverside Park (on the #5 bus line). 2pm start time.",
        rationale: "Riverside Park is accessible by public transit and has covered picnic areas. Saturday afternoon satisfies both weekend and afternoon preferences.",
        addressedConcerns: ["Location must be accessible by bus", "All food must be clearly labeled for allergens"],
        addressedDesires: ["Afternoon timing preferred", "Weekend timing preferred"]
      },
      participant: {
        id: "p1",
        name: "Sarah",
        extraction: {
          tags: [
            {
              text: "Location must be accessible by bus",
              type: "concern",
              severity: "non-negotiable",
              quote: "I don't have a car so wherever we do it needs to be on a bus line",
              underlying: "transit access"
            },
            {
              text: "Afternoon timing preferred",
              type: "desire",
              intensity: "would-like",
              quote: "Afternoons work best for me since I work mornings",
              underlying: "schedule compatibility"
            }
          ],
          message: "",
          signal: "complete"
        }
      }
    },
    expectedBehavior: [
      "Confidence should be 'high' since both constraints are satisfied",
      "Explicitly mention the #5 bus line addresses her transit concern",
      "Highlight that 2pm Saturday works with her schedule",
      "Summary should be positive and personalized",
      "No concerns to list since proposal fits well"
    ]
  },
  {
    id: "contextualization-proposal-partial-fit",
    name: "Proposal Partially Fits",
    description: "Proposal satisfies some constraints but not desires",
    promptType: "contextualization",
    edgeCaseType: "edge-case",
    input: {
      proposal: {
        question: "When and where should we hold the potluck?",
        proposal: "Sunday morning at Central Park. 10am start time.",
        rationale: "Central Park has great facilities and is accessible by bus.",
        addressedConcerns: ["Location must be accessible by bus"],
        addressedDesires: ["Weekend timing preferred"]
      },
      participant: {
        id: "p1",
        name: "Sarah",
        extraction: {
          tags: [
            {
              text: "Location must be accessible by bus",
              type: "concern",
              severity: "non-negotiable",
              quote: "I don't have a car",
              underlying: "transit access"
            },
            {
              text: "Afternoon timing preferred",
              type: "desire",
              intensity: "would-like",
              quote: "Afternoons work best for me since I work mornings",
              underlying: "schedule compatibility"
            }
          ],
          message: "",
          signal: "complete"
        }
      }
    },
    expectedBehavior: [
      "Confidence should be 'medium' - constraint met but desire not",
      "Note that transit is covered (bus accessible)",
      "Flag that 10am morning doesn't match her afternoon preference",
      "Be honest about the timing mismatch without being alarmist",
      "Suggest she might want to raise the timing concern"
    ]
  }
];

// =============================================================================
// QUESTION IDENTIFICATION SCENARIOS
// =============================================================================

export const QUESTION_IDENTIFICATION_SCENARIOS: TestScenario<QuestionIdentificationInput, any>[] = [
  {
    id: "question-id-potluck-multiple",
    name: "Potluck - Multiple Participants",
    description: "Identify questions from potluck with 4 people's constraints",
    promptType: "questionIdentification",
    edgeCaseType: "happy-path",
    input: {
      collaboration: {
        id: "collab-004",
        outcome: "Neighborhood potluck in the park",
        creator: "Sarah",
        participants: [
          {
            id: "p1",
            name: "Sarah",
            extraction: {
              tags: [
                {
                  text: "Location must be accessible by bus",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I don't have a car so wherever we do it needs to be on a bus line",
                  underlying: "transit access"
                },
                {
                  text: "Afternoon timing preferred",
                  type: "desire",
                  intensity: "would-like",
                  quote: "Afternoons work best for me since I work mornings",
                  underlying: "schedule compatibility"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p2",
            name: "Mike",
            extraction: {
              tags: [
                {
                  text: "Per-person contribution under $20",
                  type: "concern",
                  severity: "preference",
                  quote: "I'd like to keep costs reasonable - maybe everyone stays under $20",
                  underlying: "budget consciousness"
                },
                {
                  text: "Wants to bring homemade chili",
                  type: "desire",
                  intensity: "would-love",
                  quote: "I make a killer chili that I'd love to bring",
                  underlying: "contribution pride"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p3",
            name: "Jordan",
            extraction: {
              tags: [
                {
                  text: "All food must be clearly labeled for nut allergies",
                  type: "concern",
                  severity: "non-negotiable",
                  quote: "I have a severe nut allergy - it's life-threatening",
                  underlying: "safety"
                },
                {
                  text: "Live music entertainment",
                  type: "desire",
                  intensity: "would-love",
                  quote: "It would be amazing if we could have live music - I know a guy",
                  underlying: "atmosphere enhancement"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p4",
            name: "Pat",
            extraction: {
              tags: [
                {
                  text: "Weekend timing preferred",
                  type: "desire",
                  intensity: "would-like",
                  quote: "Weekends are better for me",
                  underlying: "availability"
                },
                {
                  text: "Simple contribution like drinks",
                  type: "desire",
                  intensity: "nice-to-have",
                  quote: "I hope I can just bring drinks or something simple",
                  underlying: "low-effort participation"
                }
              ],
              message: "",
              signal: "complete"
            }
          }
        ],
        constraints: [
          {
            text: "All food must be clearly labeled for allergens",
            anonymous: false,
            participantId: "p3"
          }
        ],
        when: undefined,
        where: undefined
      }
    },
    expectedBehavior: [
      "Identify 'when' question with no major conflict (afternoon + weekend = Saturday/Sunday afternoon)",
      "Identify 'where' question - need bus-accessible park",
      "Identify 'budget' question - $20 per person preference",
      "Identify 'what' question - contributions (food, music)",
      "Note that 'budget' and 'what' are coupled (live music costs money)",
      "List consensus items: allergen labeling (non-negotiable), specific contributions",
      "Should NOT show conflict on timing since positions are compatible"
    ]
  },
  {
    id: "question-id-two-person-conflict",
    name: "Two Person - Direct Conflict",
    description: "Identify questions when two people have opposing positions",
    promptType: "questionIdentification",
    edgeCaseType: "edge-case",
    input: {
      collaboration: {
        id: "collab-012",
        outcome: "Weekend getaway for couple",
        creator: "Alex",
        participants: [
          {
            id: "p1",
            name: "Alex",
            extraction: {
              tags: [
                {
                  text: "Beach destination",
                  type: "desire",
                  intensity: "would-love",
                  quote: "I really want to relax on a beach",
                  underlying: "relaxation and warmth"
                },
                {
                  text: "Warm weather",
                  type: "concern",
                  severity: "strong-preference",
                  quote: "I can't stand the cold",
                  underlying: "temperature comfort"
                },
                {
                  text: "Budget under $500 total",
                  type: "concern",
                  severity: "strong-preference",
                  quote: "We need to keep this affordable",
                  underlying: "financial constraint"
                }
              ],
              message: "",
              signal: "complete"
            }
          },
          {
            id: "p2",
            name: "Jordan",
            extraction: {
              tags: [
                {
                  text: "Mountain destination",
                  type: "desire",
                  intensity: "would-love",
                  quote: "I've been wanting to go hiking in the mountains",
                  underlying: "adventure and activity"
                },
                {
                  text: "Cooler weather preferred",
                  type: "desire",
                  intensity: "would-like",
                  quote: "I prefer cooler weather for hiking",
                  underlying: "temperature comfort for activity"
                },
                {
                  text: "Budget under $500 total",
                  type: "concern",
                  severity: "strong-preference",
                  quote: "Yeah we should keep costs down",
                  underlying: "financial constraint"
                }
              ],
              message: "",
              signal: "complete"
            }
          }
        ],
        constraints: [],
        when: "Next month",
        where: undefined
      }
    },
    expectedBehavior: [
      "Identify 'where' question with CONFLICT - beach vs mountains",
      "Identify 'what' question with conflict - relaxation vs hiking",
      "Identify 'budget' with consensus - both agree under $500",
      "Note coupling between 'where' and 'what' (destination determines activities)",
      "List consensus: budget constraint, timing (next month)",
      "This is the core two-person mediation scenario"
    ]
  }
];

// =============================================================================
// ALL SCENARIOS EXPORT
// =============================================================================

export const ALL_SCENARIOS = [
  ...BRIEFING_SCENARIOS,
  ...EXTRACTION_SCENARIOS,
  ...SYNTHESIS_SCENARIOS,
  ...CONTEXTUALIZATION_SCENARIOS,
  ...QUESTION_IDENTIFICATION_SCENARIOS
];

export function getScenariosByType(promptType: string): TestScenario<any, any>[] {
  switch (promptType) {
    case 'briefing':
      return BRIEFING_SCENARIOS;
    case 'extraction':
      return EXTRACTION_SCENARIOS;
    case 'synthesis':
      return SYNTHESIS_SCENARIOS;
    case 'contextualization':
      return CONTEXTUALIZATION_SCENARIOS;
    case 'questionIdentification':
      return QUESTION_IDENTIFICATION_SCENARIOS;
    default:
      return [];
  }
}
