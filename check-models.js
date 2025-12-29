const { GoogleGenerativeAI } = require("@google/generative-ai");

// Replace this string with your actual API Key
const genAI = new GoogleGenerativeAI("AIzaSyBk32HaiFV7qIOGyaFJXDraeV6HAe0t11o");

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // This is a special command to fetch the list of models
    // (We use the internal fetch method because the SDK helper is sometimes tricky)
    console.log("Checking available models...");
    
    // Using a simpler way to list models directly would be ideal, 
    // but let's try a direct test of the oldest, most standard model:
    const testModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const result = await testModel.generateContent("Hello");
    console.log("Success! gemini-1.0-pro works.");
    
  } catch (error) {
    console.log("--------------------------------");
    console.log("ERROR DETAILS:");
    console.log(error.message);
    console.log("--------------------------------");
    console.log("SUGGESTION: The API Key might be from a project where the API isn't enabled.");
  }
}

listModels();