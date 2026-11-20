export class H2OTranslator {
  static translateChatRequest(body) {
    // Expects standard chat payload: { messages: [{ role: 'user', content: '...' }], system: '...' }
    const messages = body.messages || [];
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }]
    }));

    const systemInstruction = body.system ? { parts: [{ text: body.system }] } : undefined;

    return {
      contents,
      systemInstruction
    };
  }

  static translateResponse(geminiResponse) {
    const text = geminiResponse.text ? geminiResponse.text() : '';
    return {
      role: 'assistant',
      content: text
    };
  }
}
