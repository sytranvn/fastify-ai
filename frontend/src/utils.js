import { useState, useCallback } from "react";
import { aiPrompt, aiStream, setBaseUrl } from "../api/api.mjs"

setBaseUrl(import.meta.env.VITE_AI_WARP_URL);

export const useFetchPrompt = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedPrompt = await aiPrompt({prompt});
      setPrompt(fetchedPrompt.message);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load prompt:", error);
      setLoading(false);
    }
  }, []);
  return { prompt, setPrompt, response, setResponse, fetchPrompt, loading };
};



export const handlePromptSubmit = async (prompt, setResponse) => {
  try {
    const res = await aiStream(
      {
        prompt,
        chatHistory: []
      }
    )

    if (!res.statusCode === 200) {
      const errorResponse = await res.json();
      setResponse(`Error: ${errorResponse.message} (${res.status})`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let completeResponse = "";

    let loading = true;
    while (loading) {
      const { done, value } = await reader.read();
      if (done) break;

      const decodedValue = decoder.decode(value, { stream: false });
      const lines = decodedValue.split("\n");
      console.log(lines)

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("event: ")) {
          const eventType = line.substring("event: ".length);
          const dataLine = lines[++i];
          if (dataLine.startsWith("data: ")) {
            const data = dataLine.substring("data: ".length);
            const json = JSON.parse(data);
            if (eventType === "content") {
              completeResponse += json.response;
            } else if (eventType === "error") {
              setResponse(`Error: ${json.message} (${json.code})`);
              return;
            }
          }
        }
      }
    }

    setResponse(completeResponse);
  } catch (error) {
    console.error("Failed to fetch data:", error);
    setResponse("Failed to fetch data.");
  }
};

export const handleKeyDown = (event, handlePromptSubmitCallback) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handlePromptSubmitCallback();
  }
};
