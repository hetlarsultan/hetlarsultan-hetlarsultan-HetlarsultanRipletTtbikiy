const OLLAMA_BASE_URL =
  (typeof window !== 'undefined' && (window as any).__OLLAMA_URL__) ||
  import.meta.env?.VITE_OLLAMA_URL ||
  'http://localhost:11434';

export async function generateLocalOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3",
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) throw new Error("Ollama not reachable");
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.warn("Local Ollama fetch failed:", error);
    throw new Error("LOCAL_OLLAMA_OFFLINE");
  }
}
