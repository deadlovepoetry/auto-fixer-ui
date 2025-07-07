import React, { useEffect, useState } from 'react';

function AiFixer({ inputLogs }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // Update input when logs come from VercelLogs
  useEffect(() => {
    if (inputLogs) {
      setInput(inputLogs);
    }
  }, [inputLogs]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResult(''); // Clear old result

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: "You are an expert DevOps AI. Help fix deployment/build/runtime errors from logs. Be concise and give accurate, actionable solutions."
            },
            {
              role: "user",
              content: input
            }
          ]
        })
      });

      const data = await response.json();
      setResult(data.choices?.[0]?.message?.content || "⚠️ No meaningful response.");
    } catch (err) {
      setResult("❌ Error: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
      <h2>🧠 AI Debugging Assistant</h2>
      <textarea
        rows={10}
        cols={90}
        placeholder="Paste or review logs here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
      />
      <br />
      <button onClick={handleSubmit} disabled={loading || !input.trim()} style={{ padding: '10px 20px' }}>
        {loading ? "Analyzing..." : "Get AI Suggestion"}
      </button>
      {result && (
        <div style={{ marginTop: '20px', background: '#e6f4ea', padding: '15px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
          <strong>💡 Suggested Fix:</strong>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

export default AiFixer;
