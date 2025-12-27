import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
let model = null;

// Initialize the AI model
function initializeAI() {
  if (!API_KEY) {
    console.warn('⚠️ Gemini API key not found. AI features will be disabled.');
    return false;
  }
  
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    // Using gemini-1.5-flash-latest - available in free tier
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    console.log('✅ Gemini AI initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error);
    return false;
  }
}

/**
 * Analyze a report description using Gemini AI
 * @param {string} description - The report description to analyze
 * @returns {Promise<{category: string, urgency: number, summary: string, confidence: string}>}
 */
export async function categorizeReport(description) {
  // Initialize AI if not already done
  if (!model && !initializeAI()) {
    // Try Hugging Face as fallback
    try {
      const { categorizeWithHuggingFace } = await import('./huggingface-service.js');
      console.log('⚡ Using Hugging Face AI as fallback');
      return await categorizeWithHuggingFace(description);
    } catch (hfError) {
      console.error('❌ Hugging Face also failed:', hfError);
      throw new Error('AI services unavailable. Please add API keys or try again later.');
    }
  }

  if (!description || description.trim().length < 10) {
    throw new Error('Description is too short. Please provide more details.');
  }

  const prompt = `You are an AI assistant for a coastal management system called Karavali Connect. Analyze the following beach/coastal report and provide:

1. CATEGORY: Choose ONE from: Safety Hazard, Pollution, Wildlife, Infrastructure, Beach Cleanup, Ghost Net
2. URGENCY: Rate from 1-5 (1=low, 5=critical/immediate attention needed)
3. SUMMARY: A brief 1-sentence summary (max 100 characters)
4. CONFIDENCE: Your confidence level (High/Medium/Low)

Report Description: "${description}"

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{"category":"<category>","urgency":<number>,"summary":"<summary>","confidence":"<confidence>"}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse the JSON response
    const analysis = JSON.parse(jsonText);
    
    // Validate the response
    if (!analysis.category || !analysis.urgency || !analysis.summary) {
      throw new Error('Invalid AI response format');
    }
    
    // Ensure urgency is a number between 1-5
    analysis.urgency = Math.min(5, Math.max(1, parseInt(analysis.urgency) || 3));
    
    console.log('✅ Gemini AI Analysis:', analysis);
    return analysis;
    
  } catch (error) {
    console.error('❌ Gemini AI Error:', error);
    
    // Try Hugging Face as fallback
    try {
      const { categorizeWithHuggingFace } = await import('./huggingface-service.js');
      console.log('⚡ Falling back to Hugging Face AI');
      return await categorizeWithHuggingFace(description);
    } catch (hfError) {
      console.error('❌ Hugging Face also failed:', hfError);
      
      // Provide a fallback response
      return {
        category: 'General Report',
        urgency: 3,
        summary: 'Report requires manual review',
        confidence: 'Low',
        error: 'AI services temporarily unavailable'
      };
    }
  }
}

/**
 * Check if Gemini AI is available
 * @returns {boolean}
 */
export function isAIAvailable() {
  return !!API_KEY;
}

/**
 * Get example reports for testing
 * @returns {Array<{description: string, expected: object}>}
 */
export function getExampleReports() {
  return [
    {
      description: "There's a lot of plastic bottles and trash scattered on Panambur Beach",
      expected: { category: 'Pollution', urgency: 3 }
    },
    {
      description: "Broken glass near the children's play area, very dangerous!",
      expected: { category: 'Safety Hazard', urgency: 5 }
    },
    {
      description: "Found a ghost fishing net tangled with marine debris",
      expected: { category: 'Ghost Net', urgency: 4 }
    },
    {
      description: "The beach bin is overflowing and needs to be emptied",
      expected: { category: 'Infrastructure', urgency: 2 }
    },
    {
      description: "Spotted a sea turtle nest on the beach",
      expected: { category: 'Wildlife', urgency: 4 }
    },
    {
      description: "Organizing a beach cleanup event this weekend",
      expected: { category: 'Beach Cleanup', urgency: 1 }
    }
  ];
}

// Initialize on module load
initializeAI();
