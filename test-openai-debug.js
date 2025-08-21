import 'dotenv/config';

const testOpenAI = async () => {
  const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  
  console.log('🔑 OpenAI Key Status:', openaiKey ? 'Present' : 'Missing');
  console.log('🔑 OpenAI Key Preview:', openaiKey ? `${openaiKey.substring(0, 10)}...` : 'None');
  
  try {
    console.log('🔄 Making OpenAI API call...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello' }
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error Response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI Response:', data);
    console.log('✅ OpenAI Message:', data.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ OpenAI Test Error:', error.message);
    console.error('❌ Full Error:', error);
  }
};

testOpenAI();
