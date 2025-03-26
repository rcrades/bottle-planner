# Setting Up OpenAI for Baby Bottle Planner

This guide will help you set up the OpenAI integration for the AI-powered feeding planner feature in the Baby Bottle Planner application.

## What is the AI-Powered Feeding Planner?

The AI-powered feeding planner uses OpenAI's GPT-4o model to generate personalized feeding schedules for your baby. It takes into account:

- Your baby's age
- Recommended feeding amounts and times
- Your preferred locked feeding times
- Current feeding patterns

The AI then creates a tailored 10-feeding schedule that follows pediatrician recommendations while adapting to your preferences.

## Getting an OpenAI API Key

1. **Create an OpenAI Account**
   - Go to [OpenAI's website](https://platform.openai.com/signup)
   - Sign up for an account if you don't have one

2. **Generate an API Key**
   - Log in to your OpenAI account
   - Navigate to [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Give your key a name (e.g., "Baby Bottle Planner")
   - Copy the API key that appears (you won't be able to see it again)

3. **Add the API Key to Your Application**
   - Open the `.env` file in the root directory of the project
   - Add or update the following line with your API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```
   - Save the file

## Using the AI Feeding Planner

1. Start the application using the instructions in the main README
2. Navigate to the Dashboard page
3. Click the "Plan Next 10 Feeds" button
4. The application will send your settings to OpenAI and generate a personalized feeding plan
5. The new feeding plan will be displayed in the Feeding Schedule tab

## How It Works

When you click the "Plan Next 10 Feeds" button, the application:

1. Retrieves your current settings and feeding data from Redis
2. Creates a detailed prompt with your baby's information and feeding preferences
3. Sends the prompt to OpenAI's GPT-4o model
4. Processes the response to extract the feeding schedule
5. Saves the new schedule to Redis
6. Displays the updated schedule in the UI

## Troubleshooting

### "API Key Not Valid" Error

- Make sure you've copied the entire API key correctly
- Check that the key is properly formatted in the `.env` file (no extra spaces)
- Verify that your OpenAI account is in good standing

### Rate Limit Errors

- OpenAI has rate limits on API calls
- If you're getting rate limit errors, wait a few minutes before trying again
- Consider upgrading your OpenAI plan if you need higher limits

### No Response from OpenAI

If the app fails to get a response from OpenAI:

1. Check your internet connection
2. Verify that your API key is correct
3. Check the OpenAI status page for any service outages
4. Look at the server logs for more specific error messages

## Cost Considerations

- OpenAI charges based on the number of tokens used
- The Baby Bottle Planner uses approximately 500-1000 tokens per feeding plan generation
- With typical usage (generating a plan a few times per day), the cost should be minimal
- You can monitor your usage in the OpenAI dashboard

## Privacy and Data Handling

When using the AI-powered feeding planner:

- Your baby's feeding preferences and settings are sent to OpenAI
- No personally identifiable information is included in the prompts
- All data is transmitted securely using HTTPS
- The AI-generated plans are stored only in your Redis database

For more information on OpenAI's data handling policies, please see their [privacy policy](https://openai.com/policies/privacy-policy). 