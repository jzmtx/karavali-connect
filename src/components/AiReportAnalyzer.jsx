import { useState } from 'react';
import { categorizeReport } from '../lib/gemini-service';

export default function AiReportAnalyzer({ description, onAnalysisComplete }) {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleAnalyze = async () => {
        if (!description || description.trim().length < 10) {
            setError('Please enter a detailed description (at least 10 characters)');
            return;
        }

        setAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const analysis = await categorizeReport(description);
            setResult(analysis);

            // Pass results to parent component
            if (onAnalysisComplete) {
                onAnalysisComplete(analysis);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const getUrgencyColor = (urgency) => {
        if (urgency >= 4) return 'from-red-500 to-orange-500';
        if (urgency >= 3) return 'from-orange-500 to-yellow-500';
        return 'from-green-500 to-blue-500';
    };

    const getUrgencyText = (urgency) => {
        if (urgency >= 5) return 'Critical';
        if (urgency >= 4) return 'High';
        if (urgency >= 3) return 'Medium';
        if (urgency >= 2) return 'Low';
        return 'Minimal';
    };

    return (
        <div className="space-y-4">
            {/* Analyze Button */}
            <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || !description}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
                {analyzing ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>AI is analyzing...</span>
                    </>
                ) : (
                    <>
                        <span>✨</span>
                        <span>Analyze with AI</span>
                    </>
                )}
            </button>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-300 text-sm">
                        <span className="font-bold">❌ Error:</span> {error}
                    </p>
                </div>
            )}

            {/* Results Display */}
            {result && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🤖</span>
                        <h4 className="text-white font-bold">AI Analysis Results</h4>
                    </div>

                    {/* Category */}
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                        <div className="text-xs text-blue-300 font-semibold mb-1">CATEGORY</div>
                        <div className="text-white font-bold text-lg">{result.category}</div>
                    </div>

                    {/* Urgency */}
                    <div className={`bg-gradient-to-r ${getUrgencyColor(result.urgency)} bg-opacity-20 border border-white/20 rounded-lg p-3`}>
                        <div className="text-xs text-white font-semibold mb-1">URGENCY LEVEL</div>
                        <div className="flex items-center gap-2">
                            <div className="text-white font-bold text-lg">
                                {result.urgency}/5 - {getUrgencyText(result.urgency)}
                            </div>
                            <div className="text-xl">
                                {'🔥'.repeat(Math.min(result.urgency, 5))}
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                        <div className="text-xs text-purple-300 font-semibold mb-1">AI SUMMARY</div>
                        <div className="text-white text-sm italic">"{result.summary}"</div>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Confidence:</span>
                        <span className={`font-semibold ${result.confidence === 'High' ? 'text-green-400' :
                                result.confidence === 'Medium' ? 'text-yellow-400' :
                                    'text-orange-400'
                            }`}>
                            {result.confidence}
                        </span>
                    </div>

                    {result.error && (
                        <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                            ⚠️ Note: Using fallback analysis due to: {result.error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
