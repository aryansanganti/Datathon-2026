"""
Business Insights Engine
Processes queries and generates intelligent responses using LLM
"""

from typing import Dict, Any, Optional
import os
from groq import Groq

class InsightsEngine:
    def __init__(self, mongodb_service):
        self.mongodb = mongodb_service
        
        # Configure Groq with Llama 3.3 70B Versatile
        self.client = Groq(api_key=os.getenv('GROQ_API_KEY'))
        self.model = 'llama-3.3-70b-versatile'
        
        # Load system prompt
        self.system_prompt = self._load_system_prompt()
    
    def _load_system_prompt(self) -> str:
        """Load system prompt for AI"""
        return """You are an AI Business Insights Assistant for a VP of Engineering.

You have access to comprehensive data from:
1. Jira tickets (tasks, status, assignees, deadlines)
2. GitHub commits (contributors, lines of code, files changed)
3. Team members: Aryan (AWS Solutions Architect), Ritwik (AWS Backend Developer), Mohak (AWS DevOps Engineer), Manu (AWS Cloud Engineer)
4. Project timelines and sprints

Your role:
- Provide clear, concise business insights
- Speak in a  professional English tone
- Highlight important metrics and trends
- Offer actionable recommendations
- Keep responses under 5 seconds when spoken (around 100-150 words)

Response Format:
1. Acknowledge the question briefly
2. Provide 2-3 key data points
3. Offer one insight or recommendation
4. End with a positive encouraging note

Always be helpful, accurate, and encouraging!"""
    
    def process_query(self, query: str, language: str = 'en') -> str:
        """
        Process user query and generate response
        
        Args:
            query: User's question
            language: Language code (en or hi)
        
        Returns:
            Generated response text
        """
        try:
            # Detect query type and fetch relevant data
            context = self._gather_context(query)
            
            # Generate response using LLM
            response = self._generate_response(query, context, language)
            
            return response
        except Exception as e:
            print(f"Error processing query: {e}")
            return self._get_fallback_response(language)
    
    def _gather_context(self, query: str) -> Dict[str, Any]:
        """Gather relevant context based on query"""
        context = {}
        query_lower = query.lower()
        
        # Detect query type and fetch data
        if any(name in query_lower for name in ['aryan', 'ritwik', 'mohak', 'manu']):
            # Individual status query
            for name in ['Aryan', 'Ritwik', 'Mohak', 'Manu']:
                if name.lower() in query_lower:
                    context['user_status'] = self.mongodb.get_user_status(name)
                    context['individual_contribution'] = self.mongodb.get_individual_contribution(name)
                    break
        
        if any(word in query_lower for word in ['team', 'everyone', 'all', 'performance']):
            # Team performance query
            context['team_performance'] = self.mongodb.get_team_performance()
        
        if any(word in query_lower for word in ['project', 'deadline', 'track', 'health', 'sprint']):
            # Project health query
            context['project_health'] = self.mongodb.get_project_health()
        
        if any(word in query_lower for word in ['blocker', 'issue', 'problem', 'stuck']):
            # Blockers query
            context['blockers'] = self.mongodb.get_blockers()
        
        # If no specific context, get general overview
        if not context:
            context['team_performance'] = self.mongodb.get_team_performance()
            context['project_health'] = self.mongodb.get_project_health()
        
        return context
    
    def _generate_response(self, query: str, context: Dict[str, Any], language: str) -> str:
        """Generate response using Groq Llama 3.3"""
        try:
            # Build context message
            context_str = f"User Query: {query}\n\nAvailable Data:\n"
            for key, value in context.items():
                context_str += f"\n{key}:\n{str(value)[:500]}\n"  # Limit context size
            
            # Use Groq chat completion
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": context_str}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            error_msg = str(e)
            print(f"Groq Error: {error_msg}")
            
            # Check if it's a quota error
            if '429' in error_msg or 'quota' in error_msg.lower():
                return self._get_quota_exceeded_response(language)
            
            return self._get_fallback_response(language)
    
    def _get_quota_exceeded_response(self, language: str) -> str:
        """Response when Gemini quota is exceeded"""
        if language.startswith('hi'):
            return """
            माफ़ करें, AI सर्विस की दैनिक सीमा पूरी हो गई है। 
            कृपया कुछ समय बाद फिर से प्रयास करें या अपने प्रोजेक्ट मैनेजर से संपर्क करें।
            """
        else:
            return """
            I apologize, but I've reached my daily AI quota limit. 
            The system is working perfectly - please try again in a few hours, or contact your project manager for immediate assistance.
            Your voice chatbot is fully functional and ready to provide insights once the quota resets!
            """
    
    def _get_fallback_response(self, language: str) -> str:
        """Get fallback response when LLM fails"""
        if language == 'hi':
            return "माफ़ कीजिये, मुझे आपकी query process करने में problem हो रही है। कृपया दोबारा try करें।"
        else:
            return "I'm sorry, I'm having trouble processing your query. Please try again."
    
    def get_introduction(self, language: str = 'en') -> str:
        """Get introduction message"""
        if language == 'hi':
            return """नमस्ते! मैं आपकी AI Business Insights Assistant हूं। 
मैं आपकी team के Jira tickets, GitHub commits, और project status के बारे में जानकारी दे सकती हूं।
आप मुझसे कुछ भी पूछ सकते हैं जैसे कि team का performance, किसी का status, या project की health।
मैं यहाँ आपकी मदद के लिए हूं!"""
        else:
            return """Hello! I'm your AI Business Insights Assistant. 
I can provide information about your team's Jira tickets, GitHub commits, and project status.
You can ask me about team performance, individual status, project health, or any blockers.
How can I help you today?"""


# Test function
if __name__ == '__main__':
    from dotenv import load_dotenv
    from mongodb_service import MongoDBService
    
    load_dotenv()
    
    mongodb = MongoDBService()
    engine = InsightsEngine(mongodb)
    
    print("Testing Insights Engine...")
    
    # Test queries
    test_queries = [
        "What is Aryan working on?",
        "How is the team performing?",
        "Are we on track for the deadline?"
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        response = engine.process_query(query)
        print(f"Response: {response}")
    
    mongodb.close()
    print("\n✅ Insights Engine Test Complete")
