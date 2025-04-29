import { format } from 'date-fns';
import { ChatMessage } from '@/lib/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const formattedTime = message.timestamp ? format(new Date(message.timestamp), 'h:mm a') : '';

  return (
    <div className={`${isUser ? 'user-bubble' : 'ai-bubble'} conversation-bubble`}>
      <div className="text-sm mb-1">
        {message.content}
      </div>
      <div className="text-xs text-neutral-text text-right mt-1">
        {formattedTime}
      </div>
    </div>
  );
}
