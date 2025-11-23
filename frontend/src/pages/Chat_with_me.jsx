import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Check,
    ChevronsUpDown,
    SendIcon,
    PencilIcon,
    Volume2
} from "lucide-react";
import axios from "axios";
import {Label} from "@/components/ui/label.jsx";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover.jsx";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command.jsx";
import {cn} from "@/lib/utils.js";
import {ScrollArea} from "@/components/ui/scroll-area.jsx";
import {Textarea} from "@/components/ui/textarea.jsx";
import ReactMarkdown from "react-markdown";
import { useRef } from "react";


export default function Chat_with_me() {
    const [userInput, setUserInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [speakingIndex, setSpeakingIndex] = useState(null);

    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

    const frameworks = [
        {value: "next.js", label: "Next.js"},
        {value: "sveltekit", label: "SvelteKit"},
        {value: "nuxt.js", label: "Nuxt.js"},
        {value: "remix", label: "Remix"},
        {value: "astro", label: "Astro"}
    ];
    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    useEffect(() => {
        setChatHistory([
            {prompt: null, response: "👋 Welcome! How can I assist you today?"}
        ]);
    }, []);

    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");

    const fetchResponse = async () => {
        if (!userInput.trim()) return;

        const prompt = userInput;
        setUserInput("");

        if (editingIndex !== null) {
            try {
                setIsLoading(true);
                const response = await axios.post("http://localhost:8000/api/chat", {prompt});
                const aiResponse = response.data.response;

                const updatedChat = [...chatHistory];
                updatedChat[editingIndex] = {prompt, response: aiResponse};
                setChatHistory(updatedChat);
                setEditingIndex(null);
            } catch (error) {
                console.error("Error fetching response:", error);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        setChatHistory(prev => [...prev, {prompt, response: "Typing..."}]);
        setIsLoading(true);

        try {
            const response = await axios.post("http://localhost:8000/api/chat", {prompt});
            const aiResponse = response.data.response;

            setChatHistory(prev => {
                const updated = [...prev];
                updated[updated.length - 1].response = aiResponse;
                return updated;
            });
        } catch (error) {
            console.error("Error fetching response:", error);
            setChatHistory(prev => {
                const updated = [...prev];
                updated[updated.length - 1].response = "Sorry, something went wrong.";
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSpeak = (text, index) => {
        if (!synth) return;
        if (speakingIndex === index) {
            synth.cancel();
            setSpeakingIndex(null);
        } else {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "en-US";
            synth.cancel(); // cancel any ongoing speech
            synth.speak(utterance);
            setSpeakingIndex(index);

            utterance.onend = () => {
                setSpeakingIndex(null);
            };
        }
    };
    const TypingLoader = () => (
        <div className="flex space-x-1">
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
        </div>
    );


    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-4">


            <div className="w-full h-full border-2 bg-primary-background rounded-lg shadow-primary flex flex-col p-2">
                <ScrollArea
                    className="flex flex-col h-[70vh] w-full border-2 border-muted/90 rounded-lg p-4 overflow-auto">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatHistory.map((chat, index) => (
                            <div key={index} className="space-y-2">
                                {chat.prompt && (
                                    <div className="flex justify-end">
                                        <div className="flex items-start gap-2 max-w-lg">
                                            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                                                {chat.prompt}
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                    setUserInput(chat.prompt);
                                                    setEditingIndex(index);
                                                }}
                                            >
                                                <PencilIcon className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {chat.response && (
                                    <div className="flex justify-start">
                                        <div
                                            className="bg-muted px-4 py-3 min-w-[100px] p-2 rounded-lg shadow-md relative max-w-lg prose prose-invert">
                                            {chat.response === "Typing..." ? (
                                                <TypingLoader/>
                                            ) : (
                                                <ReactMarkdown
                                                    components={{
                                                        code({node, inline, className, children, ...props}) {
                                                            const match = /language-(\w+)/.exec(className || "");
                                                            const language = match?.[1] || "code";

                                                            const copyToClipboard = () => {
                                                                navigator.clipboard.writeText(children);
                                                            };

                                                            return inline ? (
                                                                <code
                                                                    className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                                                                    {children}
                                                                </code>
                                                            ) : (
                                                                <div
                                                                    className="relative bg-zinc-900 text-white text-sm rounded-lg mb-4">
                                                                    <div
                                                                        className="flex justify-between items-center px-4 py-2 border-b border-zinc-800">
                                        <span className="capitalize text-xs text-zinc-400 font-medium">
                                  {language}
                                </span>
                                                                        <button
                                                                            onClick={copyToClipboard}
                                                                            className="text-xs text-blue-400 hover:underline"
                                                                        >
                                                                            Copy
                                                                        </button>
                                                                    </div>
                                                                    <pre className="overflow-auto p-4">
                                <code className={`language-${language}`} {...props}>
                                  {children}
                                </code>
                                </pre>
                                                                </div>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {chat.response}
                                                </ReactMarkdown>)}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute -right-10 top-2"
                                                onClick={() => toggleSpeak(chat.response, index)}
                                            >
                                                <Volume2
                                                    className={`w-5 h-5 ${
                                                        speakingIndex === index ? "text-blue-600" : "text-muted-foreground"
                                                    }`}
                                                />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={bottomRef}/>

                    </div>
                </ScrollArea>

                <div className="p-4 flex items-center">
                    <Textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (userInput.trim()) {
                                    fetchResponse();
                                }
                            }
                        }}
                        rows={3}
                        className="flex-1 resize-none p-2 border border-primary-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type your message..."
                    />

                    <Button
                        className="ml-2 w-[60px] h-[60px] p-0 flex items-center justify-center bg-primary text-white rounded-md hover:bg-blue-600"
                        onClick={fetchResponse}
                        disabled={isLoading}
                    >
                        <SendIcon className="w-6 h-6"/>
                    </Button>
                </div>
            </div>
        </div>
    );
}
