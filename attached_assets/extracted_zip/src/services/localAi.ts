
export async function generateLocalOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
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
