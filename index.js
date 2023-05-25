/*
 * How to use:
 * $ ai-translator-cli -i <JSON file to translate> -l <list of languages, comma separated, 2-letter code>
 * Exmaple: ai-translator-cli -i test.json -o {{lang}}_test.json -l es
 */
const { Configuration, OpenAIApi } = require("openai");
const { program } = require("commander");
const fs = require("fs");

async function init() {
  console.log("Setting up CLI...");
  setupCLI();
  const options = program.opts();

  const configuration = new Configuration({
    apiKey: options.secret,
  });

  // Load the JSON file
  const sourceCopy = fs.readFileSync(options.input, "utf8");
  const languages = options.languages.split(",");
  const languageMap = setupLanguageMap();

  console.log("Translating JSON to different languages...");
  for (const languageIndex in languages) {
    const language = languages[languageIndex];
    const prompt = setupPrompt(sourceCopy, languageMap.get(language));

    console.log(prompt);

    // Prompt the ChatGPT API to translate
    const completion = await getTranslation(configuration, prompt);

    // Output the translated result(s)
    // Save result json to new file
    const outputFile = options.output.replace("{{lang}}", language);
    const data = completion.data.choices[0].message.content;

    console.log(`ChatGPT response: ${data}`);
    writeFile(outputFile, data);
  }
}

function setupCLI() {
  program
    .requiredOption("-i, --input <file>")
    .requiredOption("-o, --output <file>")
    .requiredOption("-l, --languages <list>")
    .requiredOption("-s, --secret <string>");

  program.parse();
}

function setupLanguageMap() {
  languageMap = new Map();
  languageMap.set("es", "Spanish");
  languageMap.set("it", "Italian");
  languageMap.set("de", "German");
  return languageMap;
}

function setupPrompt(sourceCopy, language) {
  console.log(`Currently translating: ${language}...`);
  return `I want you to act as an English to ${language} translator that can process JSON input and provide JSON output in the same structure. You will receive JSON data containing English text, and your task is to translate the text to ${language} while maintaining the structure of the JSON. Your responses should only include the translated text within the JSON structure. Please ensure that the JSON keys remain unchanged. Avoid providing additional explanations or altering the JSON structure. Here is the JSON input: ${JSON.stringify(
    JSON.parse(sourceCopy)
  )}
	`;
}

async function getTranslation(configuration, prompt) {
  console.log("Calling Chat GPT...");
  // Init the OpenAI SDK
  const openai = new OpenAIApi(configuration);
  return await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
  });
}

function writeFile(destination, data) {
  fs.writeFileSync(destination, JSON.stringify(JSON.parse(data), null, 2));
}

module.exports = {
  init,
};

init();
