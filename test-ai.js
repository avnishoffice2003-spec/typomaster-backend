const { GoogleGenerativeAI } = require("@google/generative-ai");

// PASTE YOUR NEW KEY INSIDE THE QUOTES BELOW
const genAI = new GoogleGenerativeAI("AIzaSyDVcLaruz1webK_ZzEpLydqzc3Vns6kpAk");

async function run() {
  // We will use the standard 'gemini-1.5-flash-8b' model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = "Write a very short poem about coding.";

  console.log("... Connecting to Google AI ...");

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("\nSUCCESS! AI Response:\n");
    console.log(text);
  } catch (error) {
    console.error("\nERROR DETAILS:");
    console.error(error.message);
  }
}

run();