import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

async function testAPI() {
  try {
    console.log('Testing OpenAI API...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Say hello in one word'
        }
      ],
      max_tokens: 10,
    });

    console.log('✅ API Test Successful!');
    console.log('Response:', completion.choices[0].message.content);
    console.log('Tokens used:', completion.usage.total_tokens);
    
  } catch (error) {
    console.error('❌ API Test Failed:');
    console.error('Error:', error.message);
    console.error('Status:', error.status);
    console.error('Type:', error.type);
  }
}

testAPI(); 