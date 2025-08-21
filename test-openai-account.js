import 'dotenv/config';

const testOpenAIAccount = async () => {
  const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  
  console.log('🔑 OpenAI Key Status:', openaiKey ? 'Present' : 'Missing');
  console.log('🔑 OpenAI Key Preview:', openaiKey ? `${openaiKey.substring(0, 20)}...` : 'None');
  
  try {
    console.log('🔄 Testing OpenAI Account Status...');
    
    // Test 1: Simple completion with minimal tokens
    const response1 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hi' }
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    console.log('📊 Test 1 Status:', response1.status);
    
    if (!response1.ok) {
      const errorText = await response1.text();
      console.error('❌ Test 1 Error:', errorText);
    } else {
      const data = await response1.json();
      console.log('✅ Test 1 Success:', data.choices[0].message.content);
    }

  } catch (error) {
    console.error('❌ Account Test Error:', error.message);
  }
};

testOpenAIAccount();
