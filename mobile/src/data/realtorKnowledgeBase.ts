/**
 * Realtorverse Knowledge Base
 * The ultimate realtor AI agent - mentor, negotiator, and closing expert
 */

export const AGENT_IDENTITY = {
  name: "The Closing Room Agent",
  persona: "Expert Realtor Mentor from the Realtorverse",
  tagline: "Your secret weapon for closing deals and building your empire",
  tone: "Confident, supportive, direct, and always solutions-focused",
  style: [
    "Speaks with authority but never condescending",
    "Uses real-world examples and scenarios",
    "Celebrates wins, no matter how small",
    "Turns obstacles into opportunities",
    "Always has a strategy ready",
  ],
};

export const SYSTEM_PROMPT = `You are The Closing Room Agent - an elite realtor mentor from the Realtorverse. You're not just an AI assistant, you're a seasoned closing expert with decades of combined real estate wisdom, negotiation mastery, and client psychology expertise.

## YOUR IDENTITY
- You are confident, direct, and always solution-focused
- You speak like a trusted mentor who has closed thousands of deals
- You celebrate the agent's wins and turn their challenges into growth opportunities
- You never say "I don't know" - you always provide actionable guidance
- You understand that real estate is about relationships, timing, and strategy

## YOUR EXPERTISE AREAS
1. **Negotiation Mastery** - You know every tactic, counter-tactic, and psychological trigger
2. **Client Psychology** - You understand buyer/seller emotions and how to guide them
3. **Contract Knowledge** - You know contingencies, clauses, and legal nuances
4. **Objection Handling** - You have scripts for every objection imaginable
5. **Market Strategy** - You know how to position in any market condition
6. **Communication Excellence** - You craft messages that convert and build trust

## YOUR COMMUNICATION STYLE
- Start responses with confidence - never hedge or qualify unnecessarily
- Use "Here's what we do..." or "The play here is..." language
- Give specific, actionable advice - not generic suggestions
- When appropriate, provide word-for-word scripts they can use
- End with encouragement or a power move they can execute immediately

## RESPONSE FORMAT
- Keep responses focused and actionable
- Use bullet points for scripts and step-by-step guidance
- Bold key phrases they should memorize
- If they're facing a challenge, acknowledge it briefly then pivot to the solution

## GOLDEN RULES
1. Every problem has a solution - find it
2. The deal isn't dead until the client says no AND hangs up
3. Objections are buying signals in disguise
4. Silence is a negotiation tool - teach them to use it
5. The fortune is in the follow-up

Remember: You're their secret weapon. Make them feel like they can close ANY deal with your guidance.`;

export const NEGOTIATION_SCRIPTS = {
  multipleOffers: {
    title: "Multiple Offer Situations",
    scenarios: [
      {
        situation: "Buyer wants to submit below asking in multiple offer situation",
        script: `Here's the play: "I understand you want to protect your investment. In a multiple offer situation, we have ONE shot to make an impression. The sellers will likely take the strongest offer without countering. Let me show you the comparable sales - at [PRICE], you're still getting strong value, and you're positioning yourself to WIN this home. What matters more right now - saving $10K or losing this house entirely?"`,
        tips: [
          "Never tell them what to offer - guide them to the right decision",
          "Use loss aversion - people fear losing more than they love saving",
          "Have comps ready to justify the price",
        ],
      },
      {
        situation: "Listing agent calls asking for highest and best",
        script: `"Thanks for the heads up. Quick question - is the seller looking purely at price, or are terms like closing timeline and contingencies factors? ... Great. And ballpark, where does my buyer need to be to have a real shot?" (PAUSE - let them fill the silence)`,
        tips: [
          "Always ask clarifying questions - information is leverage",
          "The pause after your question is powerful - resist filling it",
          "Never reveal your buyer's max budget",
        ],
      },
    ],
  },
  priceReduction: {
    title: "Asking Sellers for Price Reduction",
    scenarios: [
      {
        situation: "Home has been on market 30+ days with no offers",
        script: `"[SELLER NAME], I want to have an honest conversation with you because that's what you hired me for. We've had [X] showings in [Y] days. The feedback is consistent - buyers love the home but feel the price doesn't match the market. Here's what the data shows us: [SHOW COMPS]. I have two paths for you: We can reduce to [PRICE] and likely generate offers this week, or we can wait and risk the home going stale. What makes more sense for your timeline?"`,
        tips: [
          "Lead with data, not opinion",
          "Give them control with options",
          "Tie it to THEIR timeline and goals",
        ],
      },
    ],
  },
  lowballOffers: {
    title: "Handling Lowball Offers",
    scenarios: [
      {
        situation: "Received offer 15%+ below asking",
        script: `To your seller: "We received an offer. Before I tell you the number, remember - an offer means a buyer is interested. Low offers often become closed deals. The offer is [PRICE]. Here's my recommendation: Let's counter at [PRICE] and include a 24-hour response deadline. This tells them we're serious but not desperate."`,
        tips: [
          "Never present a price without context first",
          "Every offer deserves a counter - dead deals don't close",
          "Short deadlines create urgency",
        ],
      },
      {
        situation: "Your buyer wants to submit a lowball offer",
        script: `"I'll submit whatever you want - that's my job. But let me share what typically happens with offers this far below asking: [X]% of the time, sellers either reject outright or get offended and won't negotiate. If you're serious about this home, a stronger opening offer actually gives us MORE negotiating room because it keeps the conversation alive. What's your goal here - to test the waters or to buy this house?"`,
        tips: [
          "Never refuse to submit an offer",
          "Help them understand consequences",
          "Redirect to their actual goal",
        ],
      },
    ],
  },
  inspectionNegotiations: {
    title: "Inspection Negotiations",
    scenarios: [
      {
        situation: "Major issues found - buyer wants seller to fix everything",
        script: `"Let's prioritize this list strategically. These items fall into three categories: Safety/structural issues the seller MUST address, items we can negotiate credits for, and minor issues that are just part of homeownership. I recommend we ask for repairs on [MAJOR ITEMS] and a credit of [AMOUNT] for [OTHER ITEMS]. This approach is reasonable and keeps the deal moving. Asking for everything often results in getting nothing."`,
        tips: [
          "Categorize issues to show reasonableness",
          "Credits are often easier for sellers than repairs",
          "Pick your battles wisely",
        ],
      },
      {
        situation: "Seller refuses all inspection requests",
        script: `"The seller has declined our repair requests. Here are our options: 1) Accept the property as-is - the issues total approximately [COST] to fix. 2) Counter with our top 3 priorities and see if they'll meet us halfway. 3) Exercise your inspection contingency and walk away. What matters most to you about this home, and does that outweigh these issues?"`,
        tips: [
          "Always present options, never ultimatums",
          "Quantify the cost of issues",
          "Let the buyer decide - it's their money",
        ],
      },
    ],
  },
};

export const OBJECTION_HANDLERS = {
  buyer: [
    {
      objection: "We want to wait for prices to drop",
      response: `"I hear that a lot, and it makes sense to want the best deal. Here's what the data actually shows: Even in the 2008 crash - the WORST market in history - prices only dropped about 30% from peak, and it took 5 years to hit bottom. Meanwhile, you're paying rent, building someone else's equity, and mortgage rates may rise. Let's run the numbers on waiting vs. buying now. Often, waiting costs MORE than any potential savings."`,
      followUp: "Would you like me to show you the actual math on your situation?",
    },
    {
      objection: "We need to sell our house first",
      response: `"Totally understand - you don't want to carry two mortgages. Let's look at your options: 1) Sale contingency offer - some sellers accept these in the right market. 2) Bridge loan - lets you buy before selling. 3) HELOC for down payment - use your equity now. 4) Rent-back agreement - buy now, let seller stay while you sell yours. Which of these would you like to explore?"`,
      followUp: "What's your biggest concern - the finances or the logistics?",
    },
    {
      objection: "We found something cheaper online/FSBO",
      response: `"Great - let's look at it together. I want you to get the best deal, period. A few things to verify: Has it been inspected? What's the real condition? Are there any title issues? Often FSBOs are priced without realizing the true market value - sometimes too high, sometimes hiding issues. Let me do some research and give you an honest comparison."`,
      followUp: "Send me the listing and I'll give you my professional take.",
    },
    {
      objection: "Your commission is too high",
      response: `"I appreciate you being direct - let's talk about value. My commission covers: Professional marketing that gets your home seen by thousands, negotiation expertise that typically nets sellers 5-10% MORE than FSBO, transaction management so nothing falls through the cracks, and liability protection. The question isn't what I cost - it's what I MAKE you. Most of my sellers net more even after commission. Want me to show you the data?"`,
      followUp: "What matters most to you - the lowest cost or the highest net?",
    },
  ],
  seller: [
    {
      objection: "I want to price higher and negotiate down",
      response: `"I understand that instinct - leave room to negotiate, right? Here's the challenge: In today's market, overpriced homes don't get offers to negotiate. Buyers skip them entirely. The data shows homes priced right from day one sell for 3% MORE on average than homes that sit and reduce. Your best negotiating position is multiple offers, and that only happens with strategic pricing."`,
      followUp: "Let me show you what happened with similar homes that priced high vs. market value.",
    },
    {
      objection: "My neighbor sold for more",
      response: `"Great reference point - let's look at exactly what they had. [Compare: square footage, updates, lot size, timing, condition]. Every home tells a different story. If their home had [FEATURE YOUR LISTING DOESN'T], that explains the difference. Our job is to maximize YOUR home's value based on what makes it special. What do you love most about your home that we should highlight?"`,
      followUp: "Let's focus on what makes YOUR home valuable to the right buyer.",
    },
    {
      objection: "I'm not in a hurry to sell",
      response: `"That's actually a great position to be in - no pressure means better decisions. Here's what I'd recommend: Let's price it where you'd be THRILLED to sell. If someone meets that price, amazing. If not, you're exactly where you started. The market will tell us if we're in the right range within 2-3 weeks."`,
      followUp: "What price would make you excited to move forward?",
    },
    {
      objection: "I want to try FSBO first",
      response: `"I respect that - some people make it work. Let me ask: Do you have a plan for screening buyers, handling negotiations, managing inspections, and navigating the contract? Most FSBOs that convert to agent listings do so after 3-6 months of frustration. Here's my offer: Try it for 30 days. If you get an offer, call me to review it free of charge. If it doesn't work out, I'm here."`,
      followUp: "Can I at least give you a pricing analysis so you're armed with the right information?",
    },
  ],
};

export const CLIENT_COMMUNICATION = {
  delivering_bad_news: {
    lowAppraisal: {
      script: `"I just got off the phone with the appraiser's office. The appraisal came in at [AMOUNT], which is [DIFFERENCE] below our contract price. I know this isn't the news we wanted, but this is actually negotiable. Here are our three paths forward: 1) Ask the seller to reduce to appraised value, 2) Split the difference, 3) You bring additional cash to cover the gap. The seller is motivated - I think we have leverage here. What feels right to you?"`,
      tips: [
        "Never deliver bad news without a solution",
        "Use 'we' language - you're a team",
        "Present options immediately",
      ],
    },
    failedInspection: {
      script: `"The inspection found some issues we need to discuss. I've categorized them by priority. The good news: Nothing here is a deal-breaker, but some items need to be addressed. Let's talk through each one and decide our approach. Remember - every house has issues. The question is whether these are manageable for you."`,
      tips: [
        "Categorize issues by severity",
        "Normalize the situation",
        "Focus on problem-solving",
      ],
    },
    lostBidding: {
      script: `"I just heard back - they went with another offer. I know this is disappointing. Here's what I'm doing: I'm calling the listing agent to find out exactly why, so we can adjust our strategy. Sometimes deals fall through and we get a second chance. In the meantime, I have two other properties I want you to see. The right home is out there - this just wasn't it."`,
      tips: [
        "Acknowledge the disappointment briefly",
        "Show you're taking action",
        "Redirect to the future immediately",
      ],
    },
  },
  managing_emotions: {
    anxiousBuyer: {
      approach: "Validate, then redirect to facts and process",
      script: `"I hear you - this is a big decision and it's normal to feel nervous. Let's break this down: [LIST SPECIFIC CONCERNS]. Now let me show you why each of these is manageable. You're making a smart move, and I'm going to guide you through every step."`,
    },
    frustratedSeller: {
      approach: "Acknowledge, take responsibility, provide action plan",
      script: `"You're right to be frustrated - this isn't what we expected. Here's what I'm doing about it: [SPECIFIC ACTIONS]. I'm committed to getting this sold. Let's schedule a call tomorrow to review our new strategy."`,
    },
    coldFeet: {
      approach: "Explore the root cause, don't dismiss",
      script: `"Let's slow down. Tell me what's really on your mind. [LISTEN]. These concerns are valid. Let me address each one... [ADDRESS]. The question is: Will you regret NOT doing this more than any of these concerns? Only you can answer that."`,
    },
  },
};

export const TRANSACTION_KNOWLEDGE = {
  contingencies: {
    inspection: {
      purpose: "Allows buyer to have property professionally inspected",
      typical_period: "7-14 days",
      negotiation_tips: [
        "Shorter contingency periods make offers more competitive",
        "Can negotiate repairs, credits, or price reduction",
        "Waiving entirely is risky but powerful in competitive markets",
      ],
    },
    financing: {
      purpose: "Protects buyer if loan falls through",
      typical_period: "21-30 days",
      negotiation_tips: [
        "Strong pre-approval makes this less risky for sellers",
        "Some buyers waive with proof of funds as backup",
        "Communicate with lender weekly to avoid surprises",
      ],
    },
    appraisal: {
      purpose: "Ensures property value supports loan amount",
      typical_period: "Tied to financing contingency",
      negotiation_tips: [
        "Appraisal gaps are negotiable",
        "Buyers can bring extra cash or renegotiate price",
        "Provide comps to appraiser proactively",
      ],
    },
    sale_of_home: {
      purpose: "Buyer needs to sell their home first",
      typical_period: "30-60 days",
      negotiation_tips: [
        "Weakest contingency - sellers often reject",
        "Kick-out clause protects seller",
        "Better option: bridge loan or HELOC",
      ],
    },
  },
  timeline_milestones: [
    { day: 0, milestone: "Offer accepted - clock starts" },
    { day: 3, milestone: "Earnest money deposited" },
    { day: 7, milestone: "Inspection completed" },
    { day: 10, milestone: "Inspection negotiations resolved" },
    { day: 14, milestone: "Appraisal ordered" },
    { day: 21, milestone: "Appraisal received" },
    { day: 25, milestone: "Loan commitment" },
    { day: 28, milestone: "Final walkthrough" },
    { day: 30, milestone: "Closing day" },
  ],
};

export const POWER_PHRASES = [
  "Here's the play...",
  "In my experience...",
  "The smart move here is...",
  "What I've seen work is...",
  "Let me give you the insider perspective...",
  "Here's what top agents do in this situation...",
  "The data tells us...",
  "Your leverage here is...",
  "The winning strategy is...",
  "Here's exactly what to say...",
];

export const getRandomPowerPhrase = () => {
  return POWER_PHRASES[Math.floor(Math.random() * POWER_PHRASES.length)];
};
