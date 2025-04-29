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
  
  // User data state
  const [household, setHousehold] = useState('');
  const [dietary, setDietary] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [location, setLocation] = useState('');
  const [challenges, setChallenges] = useState('');
  
  // Messages state - with a unique welcome message ID
  const [messages, setMessages] = useState<Message[]>([
    {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: ONBOARDING_RESPONSES.welcome
    }
  ]);
  
  // Track which step we're on and if onboarding is complete
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  // Scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Display the first question on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep === 0) {
        addQuestion(0);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to add a specific question to the chat
  const addQuestion = (questionIndex: number) => {
    if (questionIndex >= ONBOARDING_QUESTIONS.length) return;
    
    const question = ONBOARDING_QUESTIONS[questionIndex];
    const timestamp = Date.now();
    
    const newMessage: Message = {
      id: `question-${question.id}-${timestamp}`,
      role: 'assistant',
      content: `${question.question}\n${question.hint ? question.hint : ''}`
    };
    
    // Add checkboxes for equipment question
    if (question.id === 'equipment') {
      newMessage.checkboxes = KITCHEN_APPLIANCES.map(item => ({
        id: item.id,
        label: item.name,
        checked: false
      }));
    }
    
    // Add options for skill question
    if (question.id === 'skill' && question.options) {
      newMessage.options = question.options;
    }
    
    setMessages(prev => [...prev, newMessage]);
  };
  
  // Add a user message to the chat
  const addUserMessage = (content: string) => {
    const userMessageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMessageId,
      role: 'user',
      content
    }]);
  };
  
  // Add an assistant response to the chat
  const addAssistantResponse = (content: string) => {
    const responseId = `response-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: responseId,
      role: 'assistant',
      content
    }]);
  };
  
  // Add the completion message to the chat
  const addCompletionMessage = () => {
    const completeId = `complete-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: completeId,
      role: 'assistant',
      content: ONBOARDING_RESPONSES.complete
    }]);
    setIsComplete(true);
  };
  
  // Process user input and move to next step
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety check - don't process if we're already at the end
    if (currentStep >= ONBOARDING_QUESTIONS.length) {
      return;
    }
    
    // Validate input based on question type
    if (currentStep === 3 && !skillLevel) {
      toast({
        title: "Please select an option",
        description: "Please choose one of the options before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentStep !== 3 && currentStep !== 2 && !inputValue.trim()) {
      return;
    }
    
    const question = ONBOARDING_QUESTIONS[currentStep];
    let userResponse = '';
    
    // Store the user's response based on question type
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
        userResponse = equipment.join(', ') || 'None selected';
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
        console.log('Setting challenges to:', inputValue);
        break;
      default:
        userResponse = inputValue;
    }
    
    // Add the user's message to the chat, except for equipment
    if (userResponse && question.id !== 'equipment') {
      addUserMessage(userResponse);
    }
    
    // Clear input for text questions
    if (question.id !== 'equipment' && question.id !== 'skill') {
      setInputValue('');
    }
    
    // Get appropriate response content
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
      default:
        responseContent = "Thank you for that information!";
    }
    
    // Store the current step before incrementing
    const currentStepBeforeIncrement = currentStep;
    
    // Increment the step
    setCurrentStep(currentStepBeforeIncrement + 1);
    
    // Add the assistant's response after a brief delay
    setTimeout(() => {
      // Add the response to the current question
      if (responseContent) {
        addAssistantResponse(responseContent);
      }
      
      // If we're not at the last question, add the next question
      if (currentStepBeforeIncrement < ONBOARDING_QUESTIONS.length - 1) {
        setTimeout(() => {
          addQuestion(currentStepBeforeIncrement + 1);
        }, 1000);
      } else {
        // We're at the last question, show completion message
        setTimeout(() => {
          addCompletionMessage();
          
          // Save the household data
          try {
            const householdData = {
              name: "My Household",
              members: [
                { id: "1", name: household, age: "adult" }
              ],
              cookingSkill: skillLevel === "Give me a cooking project!" ? 5 : 
                            skillLevel === "I enjoy it when I have time" ? 3 : 
                            skillLevel === "I can follow a recipe" ? 2 : 1,
              preferences: dietary || "No special dietary preferences",
              challenges: challenges === "" ? "None specified" : challenges,
              location: location || "Unknown",
              appliances: equipment
            };
            
            // Log what's being saved
            console.log('Saving household data:', JSON.stringify(householdData, null, 2));
            console.log('Debug - Challenges state before saving:', challenges);
            
            apiRequest('POST', '/api/household', householdData)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/household'] });
            })
            .catch((error) => {
              toast({
                title: "Error",
                description: "Failed to save household information. Please try again.",
                variant: "destructive"
              });
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to save household information. Please try again.",
              variant: "destructive"
            });
          }
        }, 1000);
      }
    }, 500);
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
    // Set the skill level immediately
    setSkillLevel(option);
    
    // Auto-submit after a longer delay to ensure state updates
    setTimeout(() => {
      try {
        // Use a direct message addition approach rather than form submission
        const userMessageId = `user-${Date.now()}`;
        
        // Add user response to chat
        setMessages(prev => [...prev, {
          id: userMessageId,
          role: 'user',
          content: option
        }]);
        
        // Add assistant response
        const responseId = `response-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: responseId,
          role: 'assistant',
          content: ONBOARDING_RESPONSES.skill_response(option)
        }]);
        
        // Move to next question
        setCurrentStep(prevStep => prevStep + 1);
        
        // After a delay, show the next question
        setTimeout(() => {
          if (currentStep < ONBOARDING_QUESTIONS.length - 1) {
            addQuestion(currentStep + 1);
          } else {
            // We're at the end, show completion message
            addCompletionMessage();
          }
        }, 1000);
      } catch (error) {
        console.error("Error processing skill selection:", error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    }, 500);
  };
  
  // Handle navigation to meal plan after completion
  const handleFinish = () => {
    navigate('/this-week');
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
                  className={`max-w-[80%] rounded-xl p-3 ${
                    message.role === 'assistant'
                      ? 'bg-[#E7F6F5] text-[#333333] chat-bubble-assistant'
                      : 'bg-[#21706D] text-white chat-bubble-user'
                  }`}
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
                        onClick={() => {
                          try {
                            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                          } catch (error) {
                            console.error("Error submitting equipment selection:", error);
                            toast({
                              title: "Error",
                              description: "Something went wrong. Please try again.",
                              variant: "destructive"
                            });
                          }
                        }}
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
                          className={`w-full justify-start text-left ${
                            skillLevel === option 
                              ? 'bg-[#21706D] text-white' 
                              : 'bg-white text-[#21706D] border-[#21706D]'
                          }`}
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
                  currentStep >= ONBOARDING_QUESTIONS.length || 
                  (currentStep < ONBOARDING_QUESTIONS.length && 
                   (ONBOARDING_QUESTIONS[currentStep]?.id === 'equipment' ||
                    ONBOARDING_QUESTIONS[currentStep]?.id === 'skill'))
                }
              />
              <Button 
                type="submit" 
                className="ml-2 bg-[#21706D] hover:bg-[#195957] aspect-square p-2"
                disabled={
                  currentStep >= ONBOARDING_QUESTIONS.length ||
                  (currentStep < ONBOARDING_QUESTIONS.length && 
                   (ONBOARDING_QUESTIONS[currentStep]?.id === 'equipment' ||
                    ONBOARDING_QUESTIONS[currentStep]?.id === 'skill')) ||
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