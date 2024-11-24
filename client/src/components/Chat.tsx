import { useEffect, useState, ChangeEvent, FormEvent, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
}

interface ServerToClientEvents {
  'room-created': (code: string) => void;
  'joined-room': (data: { roomCode: string; messages: Message[] }) => void;
  'new-message': (message: Message) => void;
  'user-joined': (userCount: number) => void;
  'user-left': (userCount: number) => void;
  error: (message: string) => void;
}

interface ClientToServerEvents {
  'create-room': () => void;
  'join-room': (roomCode: string) => void;
  'send-message': (data: { roomCode: string; message: string; userId: string }) => void;
  'set-user-id': (userId: string) => void;
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3000');

export function Chat() {
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [users, setUsers] = useState<number>(0);
  const [userId, setUserId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Try to get existing userId from localStorage
    const storedUserId = localStorage.getItem('chatUserId');
    const newUserId = storedUserId || crypto.randomUUID();
    
    if (!storedUserId) {
      localStorage.setItem('chatUserId', newUserId);
    }
    
    setUserId(newUserId);

    // Initialize socket with userId
    socket.emit('set-user-id', newUserId);
  }, []);

  useEffect(() => {
    socket.on('room-created', (code) => {
      setRoomCode(code);
    });

    socket.on('joined-room', ({ roomCode, messages }) => {
      setRoomCode(roomCode);
      setMessages(messages);
      setConnected(true);
    });

    socket.on('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user-joined', (userCount) => {
      setUsers(userCount);
    });

    socket.on('user-left', (userCount) => {
      setUsers(userCount);
    });

    socket.on('error', (error) => {
      alert(error);
    });

    return () => {
      socket.off('room-created');
      socket.off('joined-room');
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('error');
    };
  }, []);

  const createRoom = () => {
    socket.emit('create-room');
  };

  const joinRoom = () => {
    socket.emit('join-room', inputCode.toUpperCase());
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputCode(e.target.value);
  };

  const handleMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('send-message', { roomCode, message, userId });
      setMessage('');
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 h-screen flex items-center justify-center">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Real-time Chat</CardTitle>
        </CardHeader>
        <CardContent>
          {!connected ? (
            <div className="space-y-4">
              <Button 
                onClick={createRoom} 
                className="w-full text-lg py-6"
                size="lg"
              >
                Create New Room
              </Button>
              <div className="flex gap-2">
                <Input
                  value={inputCode}
                  onChange={handleInputChange}
                  placeholder="Enter Room Code"
                  className="text-lg py-5"
                />
                <Button 
                  onClick={joinRoom}
                  size="lg"
                  className="px-8"
                >
                  Join Room
                </Button>
              </div>
              {roomCode && (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Share this code with your friend</p>
                  <span className="font-mono text-2xl font-bold">{roomCode}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <span>Room Code: <span className="font-mono font-bold">{roomCode}</span></span>
                <span>Users: {users}/2</span>
              </div>
              <div className="h-[500px] overflow-y-auto border rounded-lg p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === userId ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[70%] ${
                        msg.senderId === userId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Type a message..."
                  className="text-lg py-6"
                />
                <Button 
                  type="submit"
                  size="lg"
                  className="px-8"
                >
                  Send
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 