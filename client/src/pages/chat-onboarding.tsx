import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Send, ArrowRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ONBOARDING_QUESTIONS, ONBOARDING_RESPONSES, CATEGORY_EMOJIS } from '@/lib/onboarding-constants';
import { KITCHEN_APPLIANCES } from '@/lib/constants';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  options?: string[];
  checkboxes?: { id: string; label: string; checked: boolean }[];
}

export default function ChatOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: ONBOARDING_RESPONSES.welcome
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  // User data state
  const [household, setHousehold] = useState('');
  const [dietary, setDietary] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [location, setLocation] = useState('');
  const [challenges, setChallenges] = useState('');
  
  // Scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Function to display the next question
  const askNextQuestion = () => {
    if (currentQuestion >= ONBOARDING_QUESTIONS.length) {
      // We're done with all questions
      setMessages(prev => [...prev, {
        id: 'complete',
        role: 'assistant',
        content: ONBOARDING_RESPONSES.complete
      }]);
      setIsComplete(true);
      return;
    }
    
    const question = ONBOARDING_QUESTIONS[currentQuestion];
    
    // Add the next question from the assistant
    const newMessage: Message = {
      id: question.id,
      role: 'assistant',
      content: `${question.question}\n${question.hint ? question.hint : ''}`
    };
    
    // If it's the equipment question, add checkboxes
    if (question.id === 'equipment') {
      newMessage.checkboxes = KITCHEN_APPLIANCES.map(item => ({
        id: item.id,
        label: item.name,
        checked: false
      }));
    }
    
    // If it's the skill question, add options
    if (question.id === 'skill' && question.options) {
      newMessage.options = question.options;
    }
    
    setMessages(prev => [...prev, newMessage]);
  };
  
  // Initial welcome and first question
  useEffect(() => {
    // Wait a moment before showing the first question
    const timer = setTimeout(() => {
      askNextQuestion();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle user submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ignore empty submissions
    if (currentQuestion === 3 && !skillLevel) {
      // For skill level, we need a selection
      toast({
        title: "Please select an option",
        description: "Please choose one of the options before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentQuestion !== 3 && currentQuestion !== 2 && !inputValue.trim()) {
      return;
    }
    
    const question = ONBOARDING_QUESTIONS[currentQuestion];
    
    // Process different types of answers
    let userResponse = '';
    
    switch (question.id) {
      case 'household':
        userResponse = inputValue;
        setHousehold(inputValue);
        break;
      case 'dietary':
        userResponse = inputValue;
        setDietary(inputValue);
        break;
      case 'equipment':
        userResponse = equipment.join(', ');
        break;
      case 'skill':
        userResponse = skillLevel;
        break;
      case 'location':
        userResponse = inputValue;
        setLocation(inputValue);
        break;
      case 'challenges':
        userResponse = inputValue;
        setChallenges(inputValue);
        break;
    }
    
    // Add user's message to the chat
    if (userResponse) {
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userResponse
      }]);
    }
    
    // Clear input after submission (except for checkboxes and options)
    if (question.id !== 'equipment' && question.id !== 'skill') {
      setInputValue('');
    }
    
    // Add assistant's response to the user's answer
    setTimeout(() => {
      let responseContent = '';
      
      switch (question.id) {
        case 'household':
          responseContent = ONBOARDING_RESPONSES.household_response(household);
          break;
        case 'dietary':
          responseContent = ONBOARDING_RESPONSES.dietary_response(dietary);
          break;
        case 'equipment':
          responseContent = ONBOARDING_RESPONSES.equipment_response(equipment);
          break;
        case 'skill':
          responseContent = ONBOARDING_RESPONSES.skill_response(skillLevel);
          break;
        case 'location':
          responseContent = ONBOARDING_RESPONSES.location_response(location);
          break;
        case 'challenges':
          responseContent = ONBOARDING_RESPONSES.challenges_response(challenges);
          break;
      }
      
      if (responseContent) {
        setMessages(prev => [...prev, {
          id: `response-${Date.now()}`,
          role: 'assistant',
          content: responseContent
        }]);
      }
      
      // Move to the next question
      setCurrentQuestion(prev => prev + 1);
      
      // Ask the next question with a slight delay
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
      
    }, 500);
    
    // If we just finished the last question, save all the data
    if (currentQuestion === ONBOARDING_QUESTIONS.length - 1) {
      try {
        // Create the main household member
        await apiRequest('POST', '/api/household', {
          name: "My Household",
          members: [
            { id: "1", name: household, age: "adult" }
          ],
          cookingSkill: skillLevel === "Give me a cooking project!" ? 5 : 
                        skillLevel === "I enjoy it when I have time" ? 3 : 
                        skillLevel === "I can follow a recipe" ? 2 : 1,
          preferences: \`Dietary: \${dietary}. Challenges: \${challenges}\`,
          appliances: equipment
        });
          
        // Update API cache
        queryClient.invalidateQueries({ queryKey: ['/api/household'] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save household information. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Handle checkbox changes for equipment
  const handleEquipmentChange = (id: string, checked: boolean) => {
    if (checked) {
      setEquipment(prev => [...prev, id]);
    } else {
      setEquipment(prev => prev.filter(item => item !== id));
    }
  };
  
  // Handle skill level selection
  const handleSkillSelection = (option: string) => {
    setSkillLevel(option);
    // Auto-submit after a brief delay
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }, 500);
  };
  
  // Handle navigation to meal plan after completion
  const handleFinish = () => {
    navigate('/meal-plan');
  };
  
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-2xl h-screen flex flex-col">
      <Card className="flex-grow overflow-hidden flex flex-col">
        <CardContent className="pt-6 flex-grow overflow-y-auto custom-scrollbar p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={\`max-w-[80%] rounded-xl p-3 \${
                    message.role === 'assistant'
                      ? 'bg-[#E7F6F5] text-[#333333] chat-bubble-assistant'
                      : 'bg-[#21706D] text-white chat-bubble-user'
                  }\`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Render checkboxes for equipment question */}
                  {message.checkboxes && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {message.checkboxes.map(item => (
                        <div key={item.id} className="flex items-center">
                          <Checkbox
                            id={item.id}
                            checked={equipment.includes(item.id)}
                            onCheckedChange={(checked) => handleEquipmentChange(item.id, checked === true)}
                            className="mr-2"
                          />
                          <label htmlFor={item.id} className="text-sm">
                            {item.label}
                          </label>
                        </div>
                      ))}
                      
                      <Button 
                        variant="outline" 
                        className="mt-2 col-span-2 bg-white text-[#21706D] border-[#21706D]"
                        onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                      >
                        Continue
                      </Button>
                    </div>
                  )}
                  
                  {/* Render options for skill level question */}
                  {message.options && (
                    <div className="mt-3 space-y-2">
                      {message.options.map((option, idx) => (
                        <Button 
                          key={idx}
                          variant={skillLevel === option ? "default" : "outline"}
                          className={\`w-full justify-start text-left \${
                            skillLevel === option 
                              ? 'bg-[#21706D] text-white' 
                              : 'bg-white text-[#21706D] border-[#21706D]'
                          }\`}
                          onClick={() => handleSkillSelection(option)}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        
        {/* Input area */}
        <div className="p-4 border-t border-gray-200">
          {isComplete ? (
            <Button 
              className="w-full bg-[#21706D] hover:bg-[#195957]"
              onClick={handleFinish}
            >
              Start Planning Meals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="flex">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your answer here..."
                className="flex-grow"
                disabled={
                  currentQuestion >= ONBOARDING_QUESTIONS.length || 
                  ONBOARDING_QUESTIONS[currentQuestion]?.id === 'equipment' ||
                  ONBOARDING_QUESTIONS[currentQuestion]?.id === 'skill'
                }
              />
              <Button 
                type="submit" 
                className="ml-2 bg-[#21706D] hover:bg-[#195957] aspect-square p-2"
                disabled={
                  currentQuestion >= ONBOARDING_QUESTIONS.length ||
                  ONBOARDING_QUESTIONS[currentQuestion]?.id === 'equipment' ||
                  ONBOARDING_QUESTIONS[currentQuestion]?.id === 'skill' ||
                  !inputValue.trim()
                }
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}