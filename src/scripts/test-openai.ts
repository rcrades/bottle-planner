/**
 * This script tests the OpenAI integration to ensure the API key is working
 * Run with: npx tsx src/scripts/test-openai.ts
 */

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import 'dotenv/config'

async function main() {
  console.log("Testing OpenAI integration...")
  
  try {
    console.log("OPENAI_API_KEY configured:", process.env.OPENAI_API_KEY ? "Yes" : "No")
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set. Please create a .env file with your API key.")
    }
    
    // Simple test to see if the API works
    const response = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: "Generate a feeding schedule for a 3-month-old baby",
      maxTokens: 100
    })
    
    console.log("\nAPI Response:")
    console.log("=============")
    console.log(response.text)
    console.log("\nSuccess! OpenAI integration is working correctly.")
    
  } catch (error) {
    console.error("\nError testing OpenAI integration:")
    console.error(error)
    process.exit(1)
  }
}

main().catch(console.error) 