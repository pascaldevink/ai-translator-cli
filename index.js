/*
 * How to use:
 * $ ai-translator-cli -i <JSON file to translate> -l <list of languages, comma separated, 2-letter code>
 */
const { Configuration, OpenAIApi } = require("openai");
const { program } = require("commander");
const fs = require("fs");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

async function init() {
  program
    .requiredOption("-i, --input <file>")
    .requiredOption("-l, --languages <list>");

  program.parse();

  const options = program.opts();

  // Load the JSON file
  const sourceCopy = fs.readFileSync(options.input, "utf8");
  const languages = options.languages;
  const language_map = new Map();
  language_map.set("es", "Spanish");

  // Init the OpenAI SDK
  const openai = new OpenAIApi(configuration);

  const prompt = `I want you to act as an English to ${language_map.get(
    "es"
  )} translator that can process JSON input and provide JSON output in the same structure. You will receive JSON data containing English text, and your task is to translate the text to ${language_map.get(
    "es"
  )} while maintaining the structure of the JSON. Your responses should only include the translated text within the JSON structure. Please ensure that the JSON keys remain unchanged. Avoid providing additional explanations or altering the JSON structure. Here is the JSON input: ${sourceCopy}`;

  // Prompt the ChatGPT API to translate
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    temperature: 0.6,
  });

  console.log(completion);
  // Output the translated result(s)
  // Save result json to new file
}

module.exports = {
  init,
};

init();
