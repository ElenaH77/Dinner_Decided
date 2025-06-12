import MobileChatInterface from "@/components/chat/MobileChatInterface";

export default function DinnerBot() {
  return (
    <div className="h-full bg-blue-500 p-4">
      <div className="bg-yellow-400 p-2 mb-4 text-center">
        <strong>MOBILE TEST - Can you see this yellow banner?</strong>
      </div>
      <MobileChatInterface />
    </div>
  );
}