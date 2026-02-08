const axios = require('axios');
require('dotenv').config();

const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions';
const API_KEY = process.env.VITE_FEATHERLESS_API_KEY || process.env.FEATHERLESS_API_KEY;

class FeatherlessService {
  /**
   * Generate chat completion
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Additional options (temperature, max_tokens)
   */
  async generateCompletion(messages, options = {}) {
    if (!API_KEY) {
      throw new Error('Featherless API key is not configured');
    }

    let payload;
    try {
      payload = {
        model: "meta-llama/Llama-3.3-70B-Instruct",
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
        ...options
      };

      const response = await axios.post(FEATHERLESS_API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Featherless API Error:', error.response?.data || error.message);
      
      // If Llama 3.3 70B fails, try falling back to Mistral
      if (payload.model === "meta-llama/Llama-3.3-70B-Instruct") {
          console.log("Falling back to Mistral-7B...");
          try {
             const fallbackPayload = { ...payload, model: "mistralai/Mistral-7B-Instruct-v0.1" };
             const fallbackResponse = await axios.post(FEATHERLESS_API_URL, fallbackPayload, {
                headers: {
                  'Authorization': `Bearer ${API_KEY}`,
                  'Content-Type': 'application/json'
                }
             });
             return fallbackResponse.data;
          } catch (fallbackError) {
             console.error('Fallback Model Error:', fallbackError.response?.data || fallbackError.message);
             // Proceed to throw the original error or the fallback error
          }
      }

      // Pass through the status code if available
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
  }
}

module.exports = new FeatherlessService();
