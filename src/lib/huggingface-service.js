import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client
const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;
let hf = null;

function initializeHF() {
  if (!HF_TOKEN) {
    console.warn('⚠️ Hugging Face token not found. Using free tier without auth.');
    hf = new HfInference(); // Works without token but with rate limits
    return true;
  }
  
  try {
    hf = new HfInference(HF_TOKEN);
    console.log('✅ Hugging Face AI initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Hugging Face:', error);
    return false;
  }
}

/**
 * Categorize report using Hugging Face's free text classification model
 * @param {string} description - Report description
 * @returns {Promise<{category: string, urgency: number, summary: string, confidence: string}>}
 */
export async function categorizeWithHuggingFace(description) {
  if (!hf) initializeHF();

  if (!description || description.trim().length < 10) {
    throw new Error('Description too short. Please provide more details.');
  }

  try {
    // Use Hugging Face's text generation model for analysis
    const prompt = `Analyze this beach/coastal report and provide a JSON response with category, urgency (1-5), summary (max 100 chars), and confidence (High/Medium/Low).

Categories: Safety Hazard, Pollution, Wildlife, Infrastructure, Beach Cleanup, Ghost Net

Report: "${description}"

Response (JSON only):`;

    const result = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2', // Free, fast model
      inputs: prompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.3,
        return_full_text: false
      }
    });

    // Parse the response
    const text = result.generated_text.trim();
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize
      return {
        category: analysis.category || 'General Report',
        urgency: Math.min(5, Math.max(1, parseInt(analysis.urgency) || 3)),
        summary: analysis.summary || 'Report requires review',
        confidence: analysis.confidence || 'Medium'
      };
    }
    
    // Fallback parsing if JSON not found
    return parseTextResponse(text, description);
    
  } catch (error) {
    console.error('❌ Hugging Face Analysis Error:', error);
    throw error;
  }
}

/**
 * Simple rule-based categorization as ultimate fallback
 */
function parseTextResponse(text, description) {
  const lower = description.toLowerCase();
  
  // Category detection
  let category = 'General Report';
  let urgency = 3;
  
  if (lower.includes('danger') || lower.includes('broken glass') || lower.includes('sharp')) {
    category = 'Safety Hazard';
    urgency = 5;
  } else if (lower.includes('plastic') || lower.includes('trash') || lower.includes('pollution')) {
    category = 'Pollution';
    urgency = 3;
  } else if (lower.includes('net') || lower.includes('fishing')) {
    category = 'Ghost Net';
    urgency = 4;
  } else if (lower.includes('turtle') || lower.includes('wildlife') || lower.includes('animal')) {
    category = 'Wildlife';
    urgency = 4;
  } else if (lower.includes('bin') || lower.includes('infrastructure')) {
    category = 'Infrastructure';
    urgency = 2;
  } else if (lower.includes('cleanup') || lower.includes('clean')) {
    category = 'Beach Cleanup';
    urgency = 1;
  }
  
  // Urgency boost for urgent keywords
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('critical')) {
    urgency = Math.min(5, urgency + 1);
  }
  
  return {
    category,
    urgency,
    summary: description.substring(0, 100),
    confidence: 'Medium'
  };
}

/**
 * Check if Hugging Face is available
 */
export function isHFAvailable() {
  return true; // HF works without token (with limits)
}

// Initialize on load
initializeHF();
