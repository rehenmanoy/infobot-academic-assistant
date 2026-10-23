import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, RotateCcw, SendIcon, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea.jsx";
import { api, errorMessage } from "@/lib/api.js";
import { toast } from "@/hooks/use-toast.jsx";
import { cn } from "@/lib/utils.js";

// Only the most recent turns are sent, matching the server's limit of 20 messages.
const HISTORY_LIMIT = 19;
const MAX_MESSAGE_LENGTH = 4000;

const SUGGESTIONS = ["What classes do I have today?", "Summarise my week in a table", "How should I prepare for my lab exams?"];

function TypingDots() {
    return (
        <div className="flex gap-1 py-1" aria-label="InfoBot is typing">
            {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
    );
}

export default function ChatWithMe() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [speaking, setSpeaking] = useState(null);
    const bottom = useRef(null);
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

    useEffect(() => {
        bottom.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    useEffect(() => () => synth?.cancel(), [synth]);

    const send = async (text = input) => {
        const content = text.trim();
        if (!content || sending) return;
        const history = [...messages, { role: "user", content }];
        setMessages(history);
        setInput("");
        setSending(true);
        try {
            const response = await api.post("/chat", { messages: history.slice(-HISTORY_LIMIT) });
            setMessages((current) => [...current, { role: "assistant", content: response.data.reply }]);
        } catch (error) {
            setMessages((current) => current.slice(0, -1));
            setInput(content);
            toast({ title: "InfoBot could not answer", description: errorMessage(error), variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const toggleSpeak = (text, index) => {
        if (!synth) return;
        synth.cancel();
        if (speaking === index) {
            setSpeaking(null);
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_`|>-]/g, " "));
        utterance.onend = () => setSpeaking(null);
        synth.speak(utterance);
        setSpeaking(index);
    };

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({ title: "Copied" });
        } catch {
            toast({ title: "Could not copy", variant: "destructive" });
        }
    };

    return (
        <div className="flex h-[calc(100vh-7rem)] flex-col rounded-lg border bg-background">
            <div className="flex items-center justify-between border-b px-4 py-2">
                <p className="text-sm text-muted-foreground">InfoBot knows your subjects and timetable. Answers can be wrong; check important details.</p>
                {messages.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={sending}>
                        <RotateCcw className="h-4 w-4" /> New chat
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                        <p className="text-lg font-semibold">Hi! How can I help you today?</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {SUGGESTIONS.map((s) => (
                                <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto flex max-w-3xl flex-col gap-4">
                        {messages.map((message, index) => (
                            <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                                {message.role === "user" ? (
                                    <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-4 py-2 text-primary-foreground">{message.content}</div>
                                ) : (
                                    <div className="group max-w-[85%] rounded-lg bg-muted px-4 py-3">
                                        {/* react-markdown never renders raw HTML, so replies cannot inject markup. */}
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <ReactMarkdown>{message.content}</ReactMarkdown>
                                        </div>
                                        <div className="mt-1 flex gap-1 opacity-60 group-hover:opacity-100">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(message.content)} aria-label="Copy reply">
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                            {synth && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => toggleSpeak(message.content, index)}
                                                    aria-label={speaking === index ? "Stop reading" : "Read aloud"}
                                                >
                                                    {speaking === index ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {sending && (
                            <div className="flex justify-start">
                                <div className="rounded-lg bg-muted px-4 py-2">
                                    <TypingDots />
                                </div>
                            </div>
                        )}
                        <div ref={bottom} />
                    </div>
                )}
            </div>

            <form
                className="flex items-end gap-2 border-t p-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    send();
                }}
            >
                <Textarea
                    value={input}
                    maxLength={MAX_MESSAGE_LENGTH}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    rows={2}
                    className="flex-1 resize-none"
                    placeholder="Ask InfoBot... (Shift+Enter for a new line)"
                    aria-label="Message"
                />
                <Button type="submit" size="icon" className="h-12 w-12" disabled={sending || !input.trim()} aria-label="Send">
                    <SendIcon className="h-5 w-5" />
                </Button>
            </form>
        </div>
    );
}
