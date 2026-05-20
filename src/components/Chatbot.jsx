import { useState, useEffect, useRef } from "react";
import mamiAvatar from "../Assets/image.png"; // 👈 your local image
import "./Chatbot.css";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input) return;
    const userMsg = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.reply || "No response" }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "Server not responding ❌" }]);
    }

    setLoading(false);
    setInput("");
  };

  return (
    <>
      {/* Floating button with local image */}
      <button className="chat-btn" onClick={() => setOpen(!open)}>
        <img src={mamiAvatar} alt="Ask Mami" className="chat-btn-img" />
      </button>

      {open && (
        <div className="chat-container">
          {/* Header with avatar + name */}
          <div className="chat-header">
            <img src={mamiAvatar} alt="Ask Mami" className="header-avatar" />
            <div>
              <div className="header-name">Ask Mami</div>
              <div className="header-status"><span className="dot" /> Online</div>
            </div>
            <button className="close-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                {m.role === "bot" && <img src={mamiAvatar} alt="" className="msg-avatar" />}
                <div className={`msg ${m.role === "user" ? "msg-user" : "msg-bot"}`}>{m.text}</div>
              </div>
            ))}
            {loading && <div className="typing">Ask Mami is typing...</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-footer">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}