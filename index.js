/*
 * How to use:
 * $ ai-translator-cli -i <JSON file to translate> -l <list of languages, comma separated, 2-letter code>
 * Exmaple: ai-translator-cli -i test.json -o {{lang}}_test.json -l es
 */
const { Configuration, OpenAIApi } = require("openai");
const { program } = require("commander");
const fs = require("fs");

require("dotenv").config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

async function init() {
  program
    .requiredOption("-i, --input <file>")
    .requiredOption("-o, --output <file>")
    .requiredOption("-l, --languages <list>");

  program.parse();

  const options = program.opts();

  // Load the JSON file
  const sourceCopy = fs.readFileSync(options.input, "utf8");
  const languages = options.languages.split(",");
  const language_map = new Map();
  language_map.set("es", "Spanish");
  language_map.set("it", "Italian");
  language_map.set("de", "German");

  console.log(sourceCopy, language_map);

  // Init the OpenAI SDK
  const openai = new OpenAIApi(configuration);

  for (const languageIndex in languages) {
    const language = languages[languageIndex];
    console.log(language);
    const prompt = `I want you to act as an English to ${language_map.get(
      language
    )} translator that can process JSON input and provide JSON output in the same structure. You will receive JSON data containing English text, and your task is to translate the text to ${language_map.get(
      language
    )} while maintaining the structure of the JSON. Your responses should only include the translated text within the JSON structure. Please ensure that the JSON keys remain unchanged. Avoid providing additional explanations or altering the JSON structure. Here is the JSON input: ${JSON.stringify(
      JSON.parse(sourceCopy)
    )}`;

    console.log(prompt);

    // Prompt the ChatGPT API to translate
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

    // Output the translated result(s)
    console.log(completion.data.choices[0].message.content);
    // Save result json to new file
    const outputFile = options.output.replace("{{lang}}", language);
    fs.writeFileSync(
      outputFile,
      JSON.stringify(
        JSON.parse(completion.data.choices[0].message.content),
        null,
        2
      )
    );
  }
}

module.exports = {
  init,
};

init();
