import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

let model = null

/**
 * Load the COCO-SSD model (only once)
 */
export async function loadModel() {
  if (model) return model

  try {
    model = await cocoSsd.load()
    return model
  } catch (error) {
    console.error('Failed to load AI model:', error)
    throw error
  }
}

/**
 * Detect trash in an image
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image - Image to analyze
 * @returns {Promise<object>} Detection result
 */
export async function detectTrash(image) {
  if (!model) {
    await loadModel()
  }

  try {
    // Lower threshold to catch more items (default is 0.5)
    const predictions = await model.detect(image, 100, 0.3)
    
    // Trash-related objects from COCO-SSD (expanded list)
    const trashKeywords = [
      // Food/Organic
      'bottle', 'cup', 'bowl', 'fork', 'knife', 'spoon', 'banana', 'apple', 'sandwich', 'pizza', 'orange', 'broccoli', 'carrot', 'hot dog', 'donut', 'cake',
      // Containers/Paper/Plastic
      'wine glass', 'vase', 'book', 'suitcase', 'handbag', 'backpack', 'umbrella', 'scissors',
      // Electronics (e-waste)
      'cell phone', 'mouse', 'remote', 'keyboard', 'laptop', 'tv',
      // Sports/Outdoors
      'sports ball', 'frisbee', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket'
    ]
    
    const trashDetected = predictions.some(prediction => {
      const className = prediction.class.toLowerCase()
      return trashKeywords.some(keyword => className.includes(keyword))
    })

    return {
      trashDetected,
      predictions: predictions.filter(p => {
        const className = p.class.toLowerCase()
        return trashKeywords.some(keyword => className.includes(keyword))
      }),
      confidence: trashDetected ? Math.max(...predictions.map(p => p.score)) : 0
    }
  } catch (error) {
    console.error('AI detection error:', error)
    return {
      trashDetected: false,
      predictions: [],
      confidence: 0,
      error: error.message
    }
  }
}

/**
 * Verify cleanup completion (should have no trash)
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image - Image to verify
 * @returns {Promise<object>} Verification result
 */
export async function verifyCleanup(image) {
  const result = await detectTrash(image)
  
  return {
    isClean: !result.trashDetected,
    trashCount: result.predictions.length,
    confidence: result.confidence
  }
}

