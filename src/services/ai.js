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
    // Lower threshold even further to catch everything (0.2)
    const predictions = await model.detect(image, 100, 0.2)
    
    // Blocklist: Things that are definitely NOT trash
    const nonTrashClasses = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'
    ]
    
    const trashDetected = predictions.some(prediction => {
      const className = prediction.class.toLowerCase()
      // Accept anything that is NOT in the blocklist
      return !nonTrashClasses.includes(className)
    })

    return {
      trashDetected,
      predictions: predictions.filter(p => !nonTrashClasses.includes(p.class.toLowerCase())),
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

