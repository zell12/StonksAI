import { API_BASE_URL, ENABLE_BACKEND_AUTH } from './config';

export interface FriendlyError {
    title: string;
    message: string;
    isQuota: boolean;
}

/**
 * Analyzes raw errors from APIs/Gemini and returns a user-friendly object.
 * Also logs the error to the backend database for admin review.
 * 
 * @param module The component or function where the error occurred
 * @param error The raw error object
 * @param contextData Any additional data helpful for debugging (inputs, state)
 * @param modelId Optional: The specific AI model that was being used (if known)
 */
export const handleAndLogError = async (
    module: string, 
    error: any, 
    contextData: any = {}, 
    modelId?: string
): Promise<FriendlyError> => {
    
    const errorString = error?.message || String(error);
    
    // Serialize full technical details (Stack trace, name, etc.)
    const technicalDetails = JSON.stringify({
        name: error?.name,
        stack: error?.stack,
        raw: errorString
    });

    let title = "System Error";
    let message = "An unexpected error occurred during analysis.";
    let isQuota = false;

    // Detect common issues
    if (errorString.includes("429") || errorString.includes("quota") || errorString.includes("limit") || errorString.includes("429")) {
        title = "High Traffic / Rate Limit";
        message = "The AI model is currently experiencing high traffic or you have hit a rate limit. Please wait a moment and try again.";
        isQuota = true;
    } else if (errorString.includes("503") || errorString.includes("overloaded") || errorString.includes("timeout")) {
        title = "AI Model Busy";
        message = "The reasoning engine is currently overloaded. Please retry the operation.";
    } else if (errorString.includes("network") || errorString.includes("fetch")) {
        title = "Connection Failed";
        message = "Unable to reach the intelligence servers. Check your internet connection.";
    } else if (errorString.includes("candidate") || errorString.includes("parse") || errorString.includes("JSON")) {
        title = "Analysis Failed";
        message = "The AI failed to generate a valid structured response for this specific query. It may be hallucinating invalid data.";
    }

    // Fire and forget logging
    if (ENABLE_BACKEND_AUTH) {
        try {
            const userStr = localStorage.getItem('quantai_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const email = user?.email || 'anonymous';

            fetch(`${API_BASE_URL}/system/log-error`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    module,
                    errorMessage: errorString,
                    context: contextData,
                    model: modelId,
                    technicalDetails: technicalDetails
                })
            }).catch(e => console.error("Failed to send error log", e));

        } catch (loggingError) {
            console.error("Logging system failed", loggingError);
        }
    }

    return { title, message, isQuota };
};