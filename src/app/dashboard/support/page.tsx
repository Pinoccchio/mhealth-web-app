"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Search } from "lucide-react"

type Conversation = {
  id: number
  name: string
  lastMessage: string
  timestamp: string
}

// Mock data for conversations
const conversations: Conversation[] = [
  { id: 1, name: "John Doe", lastMessage: "I need help with my account", timestamp: "10:30 AM" },
  { id: 2, name: "Jane Smith", lastMessage: "How do I update my profile?", timestamp: "Yesterday" },
  { id: 3, name: "Bob Johnson", lastMessage: "I can't access patient records", timestamp: "2 days ago" },
]

// Mock data for messages in a conversation
const mockMessages = [
  { id: 1, sender: "user", content: "Hello, I'm having trouble accessing patient records. Can you help?" },
  {
    id: 2,
    sender: "support",
    content:
      "Of course! I'd be happy to help. Can you please provide more details about the issue you're experiencing?",
  },
  {
    id: 3,
    sender: "user",
    content: "When I try to open a patient's file, I get an error message saying 'Access Denied'.",
  },
  {
    id: 4,
    sender: "support",
    content: "I see. Let me check your account permissions. Can you please provide your username?",
  },
]

export default function SupportChat() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [messages, setMessages] = useState(mockMessages)
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { id: messages.length + 1, sender: "user", content: newMessage }])
      setNewMessage("")
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation List */}
      <div className="w-1/3 border-r">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Support Chats</h2>
          <div className="flex items-center space-x-2 mb-4">
            <Input placeholder="Search conversations..." />
            <Button variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                  selectedConversation === conv.id ? "bg-gray-100" : ""
                } flex items-center space-x-3`}
                onClick={() => setSelectedConversation(conv.id)}
              >
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${conv.id}`} />
                  <AvatarFallback>
                    {conv.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{conv.name}</div>
                  <div className="text-sm text-gray-500 truncate">{conv.lastMessage}</div>
                  <div className="text-xs text-gray-400">{conv.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className={`mb-4 ${message.sender === "user" ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block p-2 rounded-lg ${
                      message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  )
}

