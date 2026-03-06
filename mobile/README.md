# Closing Room - Premium Real Estate Command Center

A two-part product for elite real estate agents:
1. **Web App** (`/web`) — Cluely-style desktop coaching overlay. Open on laptop during calls. Listens live, transcribes, AI coaching tips in a side panel. Deploys to Vercel.
2. **Mobile App** (`/mobile`) — This app. On-the-go: contract upload, timelines, email generator, deal memory.

## Web App Quick Reference
- **Run:** `cd web && bun install && bun run dev` → http://localhost:5173
- **Deploy:** Vercel → Root Directory: `web` → Set `VITE_API_BASE_URL=https://preview-khkqtzrgbfko.dev.vibecode.run`
- **Requires Chrome or Edge** for live transcription (Web Speech API)

---

A futuristic, Apple Vision Pro / Neuralink-inspired productivity app for elite real estate agents. Contract-to-close command center designed to eliminate the biggest pains realtors face: missed deadlines, contract confusion, endless emails, and managing multiple deals.

**Fully Interactive & Backend-Ready** - All components feature live animations, expandable sections, notification badges, and are structured for easy API integration.

Built with Expo SDK 53 and React Native.

## App Flow (Non-Negotiable)

**ONE home. ONE hero action. Everything else supports it.**

1. **App Launch → Home Dashboard**
   - This is the FIRST and ONLY screen after the splash screen
   - No AI auto-opening, no microphone active, no negotiation auto-loading
   - Home is calm and decision-based

2. **Home Dashboard Content Order (top to bottom):**
   1. **Live Negotiation Assistant (PRIMARY HERO)** - The main reason the app exists
   2. **Add / View Active Deal** - Supports Live Negotiation
   3. **Upload Contract** - Prep intelligence
   4. **Transaction Timeline** - Ongoing clarity
   5. **AI Email Assistant** - Follow-up support
   6. **Weekly Summary** - Passive value

3. **Navigation Rules:**
   - App launch → Home Dashboard
   - Tap Live Deal Guidance → LiveDealGuidanceScreen (camera-first)
   - Exit any screen → Returns to Home Dashboard
   - **Home button (grid icon)** available on all negotiation screens to return directly to Dashboard

## Home Dashboard (Command Center)

The central hub and ONLY entry point. Clean, calm, decision-based.

**HERO: Live Deal Guidance (Camera-First)**
- Visually emphasized with larger card, amber glow, and "PRIMARY ACTION" label
- First actionable item on the page
- Opens LiveDealGuidanceScreen directly (camera-first visual guidance)
- Icon: videocam (camera icon)
- Subtext: "Silent, real-time guidance during live conversations"

**Quick Actions (in order):**
1. Add / View Active Deal - Save deal info for live negotiations
2. Upload Contract - AI extracts critical deadlines
3. Transaction Timeline - Track every milestone
4. AI Email Assistant - Professional emails in seconds
5. Weekly Summary - Client-ready updates

**Header Actions:**
- Daily Digest button
- AI Assistant button (opens dedicated Assistant page)
- Settings button
- Overdue alert badge (if applicable)

**Active Transactions Section:**
- List of active transactions with status indicators
- Tap to view transaction details

## Negotiation Launchpad (NegotiationHome)

The prep screen before entering live negotiation mode. NOT a home - it is a MODE that can always exit back to Home Dashboard.

## Splash Screen

The app features a premium futuristic glass panel splash screen that matches the Midnight Glass aesthetic, displayed on a deep Obsidian background (#050510) during app load.

## Design Language

- **Theme**: Midnight Glass aesthetic with glassmorphism panels and cinematic lighting
- **Background**: Deep Obsidian gradient (#050510 to #0F0F1A) with floating blurred orbs
- **Glass Effects**:
  - 10% opacity white backgrounds (rgba(255,255,255, 0.08))
  - 20px backdrop blur
  - Linear gradient borders (Top-Left White to Bottom-Right Transparent)
  - Soft diffuse shadows (40% opacity black)
- **Color Palette**:
  - **Sunset Magenta**: #FF006E (floating orb accent)
  - **Deep Gold**: #FFB800 (primary accent, replaces old gold)
  - **Deep Purple**: #6B21A8 (glint gradient start)
  - **Sunset Orange**: #FF6B35 (glint gradient end)
- **Typography**:
  - Headings: Crisp White (#FFFFFF)
  - Subtitles: 70% Opacity Grey (rgba(255,255,255,0.7))
- **Buttons**: Horizontal gradient (Deep Purple to Sunset Orange) with subtle inner glow for self-illumination effect
- **Style**: High-end futuristic real estate command center with cinematic depth and expensive dark mode aesthetic
- **Philosophy**: "Every deadline organized. Every deal clean. Total peace of mind."

## Features

### 1. Dashboard (Command Center)
The central hub displaying:
- CLOSING ROOM branding with gold accents
- Current transaction status badge
- **NEW:** Next required action banner with AI-extracted action text
  - Uses AI-determined priority action from contract extraction
  - Falls back to next deadline if not AI-extracted
- Quick access to all four modules via floating glass cards with notification badges
- **NEW:** Red notification badges on cards showing overdue item counts
- Active transactions list with selection
- **NEW:** AI extraction badge on transactions showing deadline count
  - Displays sparkle icon with "X deadlines extracted" text
  - Only shown for transactions with AI-extracted data
- **NEW:** Premium Floating AI Assistant Button
  - Continuous subtle 3D rotation animation
  - Hologram shimmer effect every 4 seconds
  - Soft ambient glow pulse
  - Tap to open full conversational AI panel

### Premium AI Assistant (All Screens)
**Global floating button named "Assistant" with full Claude-powered chat:**

The Assistant button now appears on EVERY screen in the app, providing constant access to AI help. When realtors say "my assistant will handle it" - that's this feature.

**Visual Effects:**
- Custom image avatar (gradient glass panel design)
- 3D rotation animation (subtle, premium feel)
- Hologram shimmer across surface every 4 seconds
- Ambient glow pulse behind button
- Press-to-brighten feedback effect

**Voice Features (Jarvis-like Experience):**
- **Voice Input**: Tap the purple mic button to speak your message
- **Voice Output**: British Oliver Enhanced voice for spoken responses
- **Full Voice-to-Voice**: Speak naturally, hear responses - true hands-free operation
- Automatic greeting when panel opens
- Voice greetings: "Hello, how may I assist you today?" etc.
- Recording state UI with pulsing red indicator
- Cancel recording option (X button)
- Speech-to-text powered by GPT-4o-transcribe

**AI Panel Features:**
- Slide-up panel with glassmorphism design
- Purple microphone button for voice input
- Text input as fallback for typing
- Quick action chips for common requests
- Scrollable conversation history
- Real-time Claude Sonnet 4 responses
- Color-coded message types:
  - Blue: Guidance and how-to advice
  - Amber: Warnings and cautions
  - Red: Deadline-related alerts
  - Green: Reassurance messages

**Context-Aware Capabilities:**
- Full access to active transaction data
- Knows all extracted deadlines
- Understands contract summary and next actions
- Can compute days remaining for any deadline
- Detects overdue items automatically
- Help with negotiation strategies and objection handling
- Coach on best practices for client communication

**Example Questions:**
- "What should I do today?"
- "Explain the inspection deadline"
- "Summarize this contract simply"
- "How many days until closing?"
- "Draft a message to my buyer"
- "Show all upcoming deadlines"

### Homepage AI Agent (The Realtor's Realtor)
**A deeply knowledgeable real estate companion - so agents never need to leave the app:**

The Realtor's Realtor knows the business inside and out. It handles any question or task a realtor faces - transactions, negotiations, clients, marketing, and business operations. Users should think "I'll just ask the app" before ever opening ChatGPT.

**Identity:**
- The Realtor's Realtor - knows this business deeply
- Calm, intelligent companion (Jarvis-style clarity)
- Trusted advisor who understands the daily grind
- Speaks realtor-to-realtor (gets it)

**Real Estate Expertise:**
- Transactions & Contracts: Purchase agreements, contingencies, earnest money, closing processes
- Negotiations & Deal Strategy: Offer tactics, counter-offers, inspection negotiations, appraisal gaps
- Client Management: Setting expectations, difficult conversations, when to fire a client
- Lead Generation & Marketing: Sphere strategies, social media, open houses, referrals
- Market Knowledge: CMAs, pricing strategy, market conditions, trends
- Business Operations: Time blocking, team building, commission splits, goal setting
- Industry Knowledge: NAR updates, MLS rules, fair housing, agency disclosure

**NEW: Floating Editor Window**
When the Realtor Assistant is activated, a floating editor window opens with these features:

*Editable Text Area:*
- Fully editable text area (not chat bubbles)
- Tap anywhere to move cursor
- Select, copy, paste text freely
- Delete, rewrite, or type at any time
- Select all functionality
- AI suggestions inserted unless muted/paused

*Control Buttons:*
- **Pause**: Temporarily stops new AI suggestions (shows "Resume" when paused)
- **Mute**: Disables AI text updates entirely - read or type without interruption
- **Recenter**: Clears conversational context, refocuses guidance on current situation WITHOUT deleting existing editor text
- **Clear**: Clears all text in the editor

*Window Behavior:*
- Slide down to minimize window (shows compact bar with status indicators)
- Slide up or tap minimized bar to expand
- Stays within app bounds (no system overlays)
- Dismissible via close button
- Status indicators show when Paused/Muted

*Tooltip Copy (on long-press):*
- Mute: "Read or type without AI updates"
- Recenter: "Refocus guidance on the current conversation"

**Implementation:** `src/components/RealtorAssistantEditor.tsx` - integrated into `src/screens/AssistantScreen.tsx`

### Conversation History (NEW)
**Automatic conversation saving with simple retrieval:**

All assistant interactions are automatically saved without requiring any user action. Conversations are stored locally and persist across app sessions.

**Auto-Save Behavior:**
- Each conversation starts saving after the first user input
- Updates automatically as the conversation continues
- Title auto-generated from first user message
- Preview text shows last assistant response
- Timestamp tracks when conversation was last updated

**History Access:**
- Single subtle clock icon in the top-right of the assistant editor window
- Tap to open the Conversation History modal
- Clean list view showing all saved conversations

**History List Display:**
- Conversation title (auto-generated from first question)
- Date/time (shows "Today", "Yesterday", or date)
- Preview line from last assistant response
- Max 50 conversations stored

**Loading Saved Conversations:**
- Tap any conversation to load it
- Opens in the existing assistant window
- Full text selection and copy support
- Silent mode enabled by default (no audio)
- Can continue the conversation if desired

**Deleting Conversations:**
- Swipe left on any conversation to reveal Delete action
- Long-press on conversation for Delete confirmation dialog
- Permanent deletion - no trash or archive
- Other conversations and assistant behavior unaffected

**Implementation:** `src/state/conversationHistoryStore.ts` + `src/components/ConversationHistoryModal.tsx`

### Progressive Window Expansion (NEW)
**Single assistant window with two presentation modes:**

The assistant window supports progressive expansion via swipe gestures, maintaining a single component with continuous conversation state.

**Compact Mode (Default):**
- Quarter-screen floating window at the bottom
- Drag handle for vertical resizing
- All existing features: voice, text, silent mode, new question
- Swipe hint at bottom: "← Swipe left to expand"

**Expanded Mode (Full-Screen):**
- Full-screen view for maximum readability
- Same conversation, same state, same assistant
- Larger text and more comfortable spacing
- Dedicated header with title and controls
- Swipe hint: "Swipe right to minimize"

**Swipe Gestures:**
- Swipe LEFT on the window to expand to full-screen
- Swipe RIGHT in expanded mode to collapse back to compact
- Visual feedback during swipe (expand/contract icons appear)
- Smooth spring animation between modes
- Haptic feedback on mode change

**State Preservation:**
- Conversation content persists across mode changes
- Silent mode, text selection, and cursor position maintained
- No reload, flash, or state reset during transitions
- Close button in expanded mode collapses (not closes)

**Implementation:** Integrated into `src/components/RealtorAssistantEditor.tsx`

**What It Does:**

*Answers Any Question:*
- Real estate specific: contracts, negotiations, market, clients
- Business building: marketing, systems, growth
- General questions: productivity, decisions, life balance
- "How would you handle..." scenarios

*Handles Tasks:*
- Draft emails, texts, and client communications
- Calculate commissions, net sheets, offer comparisons
- Create listing presentations and buyer consultation outlines
- Write property descriptions and marketing copy
- Build action plans and checklists
- Create social media post ideas
- Draft scripts for calls and follow-ups

**UI Behavior:**
- Single sparkles icon button in Dashboard header
- Tapping opens the dedicated Assistant page
- Swipe down to close and return to Dashboard
- Full conversation history visible and reusable
- Long-press messages to copy or delete
- Text is selectable for easy copying

**Tone:**
- Calm and composed - never frantic
- Knowledgeable but not condescending
- Direct and practical - no fluff
- Supportive like a trusted mentor

**Strict Limitations:**
- No exact wording for LIVE, ACTIVE negotiations (use Live Negotiation Assistant)
- No legal advice (recommend attorneys)
- No tax advice (recommend CPAs)
- No jokes or roleplay

**Page Scope:**
- Active on: Homepage (Dashboard) only
- Other pages: Unchanged
- Live Negotiation Assistant: Remains untouched

### Live Deal Guidance (Camera-First Visual Mode)
**The primary camera-based guidance feature for live conversations.**

A silent, real-time assistant that works alongside calls, texts, meetings, and in-person conversations. Camera-first, audio-second, always silent. Does not initiate calls.

**Camera Behavior (Critical):**
- Default to FRONT-FACING camera
- Allow manual toggle to rear camera
- Camera is LIVE VIEW ONLY
- DO NOT capture photos
- DO NOT auto-take images
- DO NOT play shutter sounds
- No images are saved or processed as photos

**Core Behavior:**
- Camera activates immediately when opened (front-facing by default)
- Microphone is OFF by default (camera-first, audio-second)
- AI NEVER speaks out loud - text-only guidance
- No automatic listening or forced audio capture
- Works alongside your phone - does not initiate calls

**UI Layout (Picture-in-Picture):**
- Camera feed occupies the top ~58% of screen
- Semi-transparent guidance panel overlays the bottom ~42%
- Guidance panel remains fully readable and editable
- Camera never blocks text interaction

**Communication Flow:**
- Phone Call button (green) opens Contact Picker with device contacts, deal contacts, and manual entry
- Video Call button (teal) opens Contact Picker for FaceTime video calls
- Text button (blue) opens Contact Picker for SMS messaging
- Email button (purple) opens Contact Picker for email
- Contact Picker features:
  - Search across all device contacts
  - Deal contacts shown at top for quick access
  - Manual entry option with keypad toggle
  - Validates phone numbers (10+ digits) and emails
  - Initiates action via native iOS apps (Phone, FaceTime, Messages, Mail)
- Use during calls & meetings - guidance runs alongside
- Supports both phone calls and FaceTime video calls

**Guidance Panel:**
- Editable text workspace (cursor-enabled)
- Copy / paste / select-all support
- Scrollable guidance history
- Color-coded guidance tags
- Silent by default (no AI voice)

**Guidance Style:**
- Short, actionable prompts (1-2 sentences)
- Examples:
  - "Pause. Let them finish."
  - "Acknowledge concern before responding."
  - "Reframe price as long-term value."
- Color-coded tags: Strategy (amber), Objection (red), Language (green), Timing (blue), Rapport (purple), Context (gray)

**Bottom Bar Buttons:**
- **Pause/Resume**: Temporarily stops new AI suggestions
- **Re-Center**: Clears AI context but keeps workspace text
- **Clear**: Clears the workspace text
- **Toggle Mic**: Turn microphone ON/OFF (OFF by default)

**Important Constraints:**
- This camera-based behavior applies ONLY to Live Deal Guidance
- Does NOT alter other assistants or pages
- Does NOT remove existing features
- Does NOT add voice output
- Phone and FaceTime calls are initiated via native iOS apps
- Does NOT introduce new permissions beyond camera access
- Preserves all other app flows exactly as-is

**Design Intent:**
Live Deal Guidance should feel like a discreet, professional visual assistant - never invasive, never loud, never surprising. It works alongside your existing communication tools.

**Implementation:** `src/screens/LiveDealGuidanceScreen.tsx`

### Live Negotiation Assistant (Legacy Mode Selection)
**The SOLE place for recording, listening, and real-time AI negotiation guidance.**

A professional negotiation companion designed for high-stakes conversations. This is a silent partner that helps real estate professionals close deals with text-based guidance.

**NEW: Mode Selection Flow**
After tapping "Start Live Negotiation" on the homepage, users must select how they are using the app:

1. **On a Call** (Default Professional Mode)
   - AI does NOT speak - text-only guidance
   - Microphone is optional, push-to-talk only
   - Silent, glanceable guidance while on speakerphone/earbuds
   - Color: Green (#10B981)

2. **In Person / Meeting**
   - AI listens when user taps the mic
   - Responses appear in the text workspace
   - Optional voice replies allowed
   - Color: Blue (#3B82F6)

3. **Writing / Preparing**
   - NO microphone at all
   - AI is text-only
   - Full copy/paste workflow for drafting
   - Color: Purple (#A855F7)

**NEW: Prep/Notes Panel (Also on Live Negotiation Screen)**
The same Prep/Notes slide-up panel from the homepage is available on the Live Negotiation screen:
- Identical UI and behavior as the homepage panel
- Same slide-up gesture controls and snap points
- Fully editable notes that sync with the homepage
- Camera capture and file attachment buttons
- Shows item count badge when content exists
- **Shared State**: Any edits made here are reflected on the homepage and vice versa
- Ensures continuous context throughout the entire negotiation workflow

**NEW: Universal Text Workspace**
A persistent editable text box that serves as the primary interaction surface:
- AI guidance appears here automatically
- Fully editable - tap anywhere to place cursor
- Select, copy, paste, delete text freely
- Accepts pasted text and manual input
- Slides and resizes naturally with content
- Character count displayed

**NEW: Toolbar Controls**
- **Pause/Resume**: Temporarily stops new AI suggestions
- **Re-Center**: Clears AI context but keeps workspace text
- **Clear**: Clears the workspace text
- **Call**: Quick access to phone dialer (On a Call mode only)

**Design Philosophy:**
- Silent partner - AI never auto-records or auto-speaks
- Text is primary - workspace is the main interaction surface
- User-controlled - nothing happens without explicit action
- Professional - clean, focused, single-purpose interface

**Layout:**
1. Clean header with mode indicator and help icon
2. Optional deal context selector (hidden during active session)
3. Coaching prompts display area
4. Universal text workspace with toolbar
5. Optional microphone button (modes that allow it)

**Important Notes:**
- AI never auto-records or auto-speaks on this screen
- Microphone is always push-to-talk and optional
- Text workspace is always editable
- User maintains full control at all times

**Features:**
- Single-button session control (Start/Stop)
- Transcription of conversation during active sessions
- Suggested phrasing appears during key negotiation moments
- Different response types: urgent, strategy, watch, phrasing, context, support
- Session timer (visible in header when live)
- Make a Call button (appears during active session)
- Voice output option for suggestions

**Deal Context Memory (Persistent)**
A feature for saving and managing deal-related information that persists across sessions:

- **Saved Deals Screen**: Central hub for viewing all saved deal contexts
  - Lists all saved deals with status indicators
  - Tap any deal to set it as "Active" for Live Deal Guidance
  - Active deal shows green checkmark and "ACTIVE" badge
  - Demo deals marked with purple "DEMO" badge
  - Content indicators show what data exists (Notes, Email, Files)
  - Edit button (pencil icon) to modify deal details
  - Delete button (trash icon) with confirmation modal
  - "Add New Deal" button at top and bottom of list
  - Empty state with helpful onboarding message
- **Add Deal Context** button available on Dashboard and Live Negotiation screens
- **Deal Context Memory Screen**: Full form for creating/editing deal contexts
  - Deal Name / Label (e.g., "123 Maple St - Buyer offer round 2")
  - Property Address
  - Client Phone Number
  - Key Notes (multi-line text area)
  - Paste Email / Message (multi-line text area for full email threads)
  - Upload Documents (PDFs and images)
- **Active Deal Context**: Selected deal provides context to AI during Live Deal Guidance
  - Shows "Active deal selected for Live Guidance" indicator
  - Context automatically provided to AI for better suggestions
- **Persistent Storage**: All deal contexts saved via AsyncStorage and available across sessions
- **Privacy**: Data is provided by the user, used only during the active session, not shared externally

**Deal Memory Panel (Session)**
A collapsible panel for storing temporary deal-related information during live sessions:

- **Add Notes**: Quick text input for key facts, numbers, or reminders
- **Paste Email or Text**: Multi-line input for pasting emails, messages, or document text
- **Upload Files**: Upload PDFs or images (inspection reports, contracts, etc.)
- **Take Photo/Screenshot**: Capture photos via camera or select from gallery

**Triggered Recall Behavior:**
The assistant responds only when the conversation mentions specific keywords:
- Price, counteroffer, offer, credit, concession
- Inspection, repairs, findings, issues
- Appraisal, financing, loan, underwriting
- Contingency, deadline, closing date, possession, earnest money, HOA

**Response Structure:**
1. Suggested Approach (1-2 sentences max, thinking-support focused)
2. Relevant Context from Your Notes (OPTIONAL - bullet points, max 3, only if directly related)
3. Suggested Phrasing (one sentence, in quotation marks)

**Safety Language:**
- All references clarify data comes from the user
- Uses phrases like "Based on the notes you added..." or "If your agreement confirms..."
- Never implies independent verification or legal interpretation

**Helps You Think Through:**
- Negotiation Approaches
- Response Options
- Phrasing Ideas
- Deal Context Recall

**How to Use:**
1. Navigate to "Live Negotiation Assistant" from Dashboard
2. Select an Active Deal Context from the dropdown (or create one via + button)
3. Optionally expand Deal Memory and add session-specific info
4. Tap "Start" before your call and put phone on speaker
5. See suggested phrasing during key negotiation moments
6. Use your own judgment - this is decision support
7. Tap "Stop" when call ends

### 2. Upload Contract Module (AI-Powered Transaction Coordinator)
**Complete Interactive Flow with Real AI Extraction:**

**State 1 - Idle:**
- Large floating glass card with PDF upload prompt
- Tap to upload action opens document picker
- Supports PDF and image files

**State 2 - Uploaded:**
- **NEW:** Visible "Upload Successful" banner with green checkmark and glow
- File info display (name, size) with refresh option
- "Extract Critical Dates" button ready to process
- **NEW:** Automatically sends PDF to Make.com webhook for external processing

**State 3 - Processing (AI Extraction):**
- **NEW:** Animated scan line moving through icon container
- **NEW:** Pulsing processing animation
- **AI-POWERED:** Real Claude API extraction of contract deadlines
- **EXTRACTS ALL DATES:**
  - Earnest money due date
  - Inspection period end
  - Appraisal deadline
  - Loan commitment date
  - Closing/settlement date
  - Repair request deadline
  - HOA document deadlines
  - Title commitment deadline
  - Contingency periods
  - Seller response deadlines
  - ANY other date-specific obligations
- Visual feedback with cyan glow during processing

**State 4 - Complete (Real Extracted Data):**
- **AI-EXTRACTED:** Real deadlines from uploaded contract (not placeholders!)
- **NEW:** Contract Summary panel with AI-generated overview
  - 2-3 sentence summary of key contract obligations
  - Overdue warning badge if applicable
- **NEW:** Next Required Action panel
  - AI-determined most urgent action
  - Displays associated deadline date
- **NEW:** Extracted property details:
  - Property address (if found in contract)
  - Client/buyer name (if found)
  - Purchase price (if found)
  - Contract signing date (if found)
- Timeline nodes with real extracted dates, chronologically sorted
- Status indicators (current/upcoming/overdue) calculated from real dates
- Full editing capability - tap to edit any deadline, long press to delete
- "Save to Transactions" button persists ALL extracted data:
  - All deadlines with accurate dates
  - Contract summary
  - Next required action
  - Property details
  - Extraction timestamp
- **Backend-Ready:** Full Claude API integration via `/src/api/contract-extraction.ts`

**Technical Implementation:**
- Uses Claude 3.5 Sonnet with PDF document analysis
- Structured JSON extraction with detailed prompt engineering
- Automatic date parsing and status calculation
- Deadline sorting and categorization
- Helper functions for date manipulation and overdue detection
- Persistent storage with AsyncStorage via Zustand

### 3. Transaction Timeline (Milestone Map)
**Fully Interactive with Detail Cards and AI Summary:**

- Current Status panel: Under Contract / Inspection / Appraisal / Clear To Close
- **NEW:** Contract Summary card (when available from AI extraction)
  - Displays AI-generated 2-3 sentence contract overview
  - Shows overdue warning badge if applicable
  - Displays extraction timestamp with sparkle icon
- **NEW:** Each milestone node is tappable - tap to expand full details
- **NEW:** Expandable detail cards show:
  - **Status Badge**: Visual indicator (Completed/Current/Upcoming/Overdue)
  - **Deadline**: Full date display with real extracted dates
  - **Suggested Next Step**: Placeholder guidance text for each milestone
  - **Mark as Completed** button with checkbox (changes node to green)
  - Smooth slide-down animations with springify effect
  - Color-coded left border matching milestone status
- **NEW:** Soft pulsing animations on current and overdue nodes (1-second cycle)
- **NEW:** Scale pulse effect (1.0 to 1.1) synchronized with glow
- Linear sequence of floating timeline nodes with real dates from contract
- Color-coded milestone indicators:
  - Green (#10B981): Completed
  - Cyan (#00D4FF, pulsing): Current
  - Red (#EF4444, pulsing): Overdue
  - Gray (#6B7280): Upcoming
- **NEW:** Dynamic connecting line heights (40px collapsed, 80px expanded)
- Full haptic feedback on tap and mark complete
- **Backend-Ready:** onToggleComplete callback fully connected to state management

### 4. AI Email Assistant
**Complete Functional Flow:**

- **Category Dropdown** with 5 email types:
  - Inspection Scheduling
  - Appraisal Request
  - Lender Follow-up
  - Title Update
  - Client Update
- **NEW:** Dynamic subject line that updates based on selected category
  - Displayed in glass card below dropdown with green accent
  - Example subjects: "Property Inspection Request", "Loan Application Status Update"
- **Tone Selector** with visual highlighting:
  - Professional (briefcase icon)
  - Friendly (happy icon)
  - Urgent (flash icon)
  - **NEW:** Selected tone highlights with glow color background and border
  - **NEW:** Checkmark icon appears on selected tone in modal
- **Generate Email Button:**
  - **NEW:** 1.5-second loading animation with rotating sync icon
  - **NEW:** Button text changes to "Generating..." during processing
  - **NEW:** Sample email text fills glass card after generation
  - Professional templates for each category × tone combination
  - Auto-replaces placeholders with transaction data (address, client name, price)
- **Copy Email Button:**
  - Inline copy button with dynamic icon (copy → checkmark)
  - **NEW:** Background changes to green when copied
  - **NEW:** Success toast slides up from bottom
  - **NEW:** Toast auto-dismisses after 2 seconds
  - Full haptic feedback on copy action
- **Regenerate Email Button:**
  - Appears below generated output
  - Re-runs generation with same parameters
  - Respects loading state
- **Backend-Ready:** All templates ready for AI API swap (see EMAIL_TEMPLATES in code)

### 5. Weekly Update Summary
**Complete Generation Flow:**

**Initial State:**
- Large glass card with "Generate Summary" prompt
- Sparkles icon with gold accent
- Description: "Create a comprehensive client-ready report"

**Generation Flow:**
- **NEW:** Tap "Generate Summary" button triggers 1-second loading animation
- **NEW:** Button shows rotating sync icon during generation
- **NEW:** After generation, summary appears with 4 collapsible sections

**Collapsible Sections** (all with open/close animations):
1. **Completed This Week**
   - Green checkmark icon and glow
   - **NEW:** Tap header to expand/collapse with FadeIn/FadeOut
   - **NEW:** Chevron icon indicates open/closed state
   - Lists all completed deadlines with checkmark badges

2. **Upcoming Deadlines**
   - Gold calendar icon
   - **NEW:** Collapsible with smooth animations
   - Shows deadline dates with status badges (current = gold background)
   - Displays property address for each item

3. **Items That Need Attention**
   - Red alert icon with high intensity glow
   - **NEW:** Collapsible section
   - Only appears if there are overdue items
   - Pulsing red dot indicators

4. **Next Steps**
   - Cyan arrow icon
   - **NEW:** Collapsible with slide animations
   - Placeholder guidance steps
   - Chevron bullet points

**Actions:**
- **NEW:** "Share Summary" button (copies formatted text to clipboard)
- **NEW:** "Copy All" button in header (only visible after generation)
- Copy feedback with checkmark icon change
- Full haptic feedback on all interactions
- "Powered by Closing Room" footer branding

**Backend-Ready:** All sections dynamically populate from transaction data

### 6. Active Transactions Section
**Fully Interactive Transaction Cards:**

- **NEW:** Each transaction card is tappable and navigates to TransactionDetailScreen
- **NEW:** Smart status indicators calculated from deadlines:
  - **Red (#EF4444)** = "Overdue" - Has at least one overdue deadline
  - **Green (#10B981)** = "Completed" - All deadlines completed
  - **Gold (#FFB800)** = "Active" - Normal active status
- **NEW:** Status badge with pulsing dot indicator
  - 10px circular dot with glow effect (shadowRadius: 6, shadowOpacity: 0.8)
  - Color matches status (red/green/gold)
  - Uppercase label with letter spacing
- **NEW:** Card glow color matches transaction status
- **NEW:** Chevron forward icon indicates tap-ability
- **NEW:** Medium haptic feedback on press
- **NEW:** Press automatically sets active transaction and navigates to timeline
- Displays: Address, Client Name, Price
- Staggered fade-in animations (100ms delay per card)
- Glass card with dynamic glow intensity based on status

**Navigation Flow:**
- Tap card → Set as active transaction → Navigate to TransactionDetailScreen
- Timeline screen pre-filled with transaction data
- All deadlines expandable with interactive controls

## Interaction Polish & Global Enhancements

**Smooth Transitions:**
- Native stack navigator with formSheet presentation for modal feel
- SpringifyanimationsbetweenscreensusingReactNativeReanimated
- FadeIn/FadeOut transitions on all content sections
- Staggered delays (50-100ms) create cascading entrance effects

**Tap Animations:**
- All buttons use GlowButton component with scale animations (1.0 → 0.98 → 1.0)
- Pressable cards have built-in scale animations via AnimatedPressable
- Icon buttons provide immediate visual feedback
- Color transitions on active states (e.g., copy button green → gray)

**Glass Blur & Depth:**
- BlurView with 20px intensity on all glass cards
- Dynamic glow intensity levels: low, medium, high
- Shadow effects synchronized with glow colors
- Layered gradient borders (white to transparent)
- Increased glow on active/focused elements

**Haptic Feedback:**
- Light impact on card taps and selections
- Medium impact on primary actions (generate, navigate)
- Success notification on completions
- Consistent across all interactive elements

**Backend Preparation:**
- All components use callback props for state updates
- Data containers structured for API responses
- Loading states implemented for all async operations
- **NEW:** Full Claude API integration for contract extraction
  - `/src/api/contract-extraction.ts` - Complete AI extraction service
  - Real PDF document analysis using Claude 3.5 Sonnet
  - Structured JSON output with detailed deadline extraction
  - Automatic date parsing, sorting, and status calculation
  - Helper functions: `calculateDaysRemaining()`, `isDeadlineOverdue()`, `getNextDeadline()`
- **NEW:** Enhanced transaction data model with extraction metadata
  - Stores AI-generated summary, next action, overdue flag
  - Tracks extraction timestamp for audit trail
  - Persists to AsyncStorage via Zustand middleware
- **NEW:** Updated hook: `/src/hooks/useContractExtraction.ts`
  - Replaces mock data with real Claude API calls
  - Error handling and loading state management
  - Returns complete `ExtractedContractData` object
- Error handling hooks ready for integration
- Mock data clearly marked with TODO comments

## Project Structure

```
src/
├── components/
│   ├── GlassCard.tsx        # Glass-morphism card with glow effects
│   ├── GlowButton.tsx       # Animated button with glow
│   ├── NeonDropdown.tsx     # Styled dropdown selector
│   ├── ProgressTimeline.tsx # Timeline with animated nodes
│   ├── AIAssistantOrb.tsx   # Floating AI assistant with breathing animation
│   ├── ContactPickerSheet.tsx # Unified contact picker for calls, video, text, email
│   └── index.ts
├── screens/
│   ├── DashboardScreen.tsx
│   ├── TransactionDetailScreen.tsx
│   ├── EmailGeneratorScreen.tsx
│   ├── WeeklySummaryScreen.tsx
│   ├── ContractUploadScreen.tsx
│   ├── LiveCoachingScreen.tsx
│   ├── LiveDealGuidanceScreen.tsx  # Camera-first visual guidance
│   ├── DealContextMemoryScreen.tsx  # Deal context form
│   └── SavedDealsScreen.tsx  # NEW: List and manage saved deals
├── navigation/
│   └── RootNavigator.tsx
├── state/
│   ├── realtorStore.ts      # Zustand store with persistence
│   ├── dealMemoryStore.ts   # Session memory for live negotiations
│   ├── dealContextStore.ts  # NEW: Persistent deal context storage
│   └── conversationHistoryStore.ts  # NEW: Auto-saved conversation history
├── services/
│   ├── homepageAgent.ts     # Homepage AI Agent for navigation/guidance
│   ├── multiAIAssistant.ts  # Multi-provider AI assistant service
│   └── speakerAudio.ts      # Voice output service
├── types/
│   └── navigation.ts
└── utils/
    └── cn.ts
```

## Tech Stack

- **Framework**: Expo SDK 53, React Native 0.76.7
- **Navigation**: React Navigation (native-stack with form sheets)
- **State Management**: Zustand with AsyncStorage persistence
- **Styling**: NativeWind (TailwindCSS)
- **Animations**: React Native Reanimated v3
- **Icons**: @expo/vector-icons (Ionicons)
- **Haptics**: expo-haptics
- **Gradients**: expo-linear-gradient

## Key Components

### GlassCard
Reusable glass-morphism card with Midnight Glass aesthetic:
- 10% white opacity background with 20px backdrop blur
- Linear gradient border (white to transparent)
- Customizable glow color
- Soft diffuse shadows
- Press animations
- Inner glow overlays

### AIAssistantOrb
Floating AI assistant orb with:
- Breathing animation
- Rotating gradient ring
- Inner glow pulse
- Gold accent color

### ProgressTimeline
Visual timeline component with:
- Animated pulsing nodes
- Color-coded status indicators
- Connecting lines

### GlowButton
Animated button with Midnight Glass glint effect:
- Deep Purple to Sunset Orange horizontal gradient
- Subtle inner glow for self-illumination
- Multiple variants (primary, secondary, success, danger)
- Scale and glow animations on press
- Loading state support

## Premium Design Notes

This UI communicates a high-end, futuristic aesthetic:
- **Clarity**: Clean layouts with minimal text and intuitive visual hierarchy
- **Confidence**: Bold gradient buttons and professional crisp white typography
- **Control**: Every deadline visible with cinematic depth and lighting
- **Premium**: Midnight Glass aesthetic with floating blurred orbs creates an expensive, modern command center feel
- **Depth**: Large blurred orbs of Sunset Magenta and Deep Gold float behind content, creating atmospheric depth
- **Self-Illumination**: Buttons with gradient backgrounds and inner glow appear to emit light
