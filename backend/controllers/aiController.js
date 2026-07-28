const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const rewriteMessage = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        message: "Text is required",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are an AI assistant.

Your job is to rewrite messages.

Rules:
- If message is in Hinglish, improve the Hinglish.
- Fix grammar and spelling.
- Keep same meaning.
- Do not make it too formal.
- Return ONLY the rewritten message.
          `,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    res.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "AI Error",
    });
  }
};

module.exports = {
  rewriteMessage,
};