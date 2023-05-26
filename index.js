/*
 * How to use:
 * $ ai-translator-cli -i <JSON file to translate> -l <list of languages, comma separated, 2-letter code>
 * Exmaple: ai-translator-cli -i test.json -o {{lang}}_test.json -l es
 */
const { encode, decode } = require("gpt-3-encoder");
const { Configuration, OpenAIApi } = require("openai");
const { program } = require("commander");
const fs = require("fs");

function init() {
  setupCLI();
  const options = program.opts();

  const configuration = new Configuration({
    apiKey: options.secret,
  });

  // Load the JSON file
  const sourceCopy = fs.readFileSync(options.input, "utf8");
  const languages = options.languages.split(",");
  const languageMap = setupLanguageMap();

  const encoded = encode(sourceCopy);
  const max_token = 3000;
  if (encoded.length > max_token) {
    throw new Error(
      `JSON exceeding max token length. encoded length: ${encoded.length}`
    );
  }

  log(3, `Number of tokens in source copy: ${encoded.length}`);
  const decoded = decode(encoded);
  log(3, "We can decode encoded tokens back into:\n", decoded);

  log(1, "Translating JSON to different languages...");

  for (const languageIndex in languages) {
    const language = languages[languageIndex];
    const prompt = setupPrompt(sourceCopy, languageMap.get(language));

    log(2, `Prompt: ${prompt}`);

    // Prompt the ChatGPT API to translate
    const completionPromise = getTranslation(configuration, prompt);
    completionPromise.then((response) => {
        log(4, response);
        // Output the translated result(s)
        const data = response.data.choices[0].message.content;
        log(1, `Raw ChatGPT response: ${data}`);

        // Save result json to new file
        const outputFile = options.output.replace("{{lang}}", language);
        writeFile(outputFile, data);
    })
  }
}

function increaseVerbosity(_, previous) {
    return previous + 1;
  }

function setupCLI() {
  program
    .requiredOption("-i, --input <file>", 'Source JSON file to translate. Only accepts a single file')
    .requiredOption("-o, --output <file>", 'Output pattern to save translations to. Can use {{lang}} as a placeholder for a target language')
    .requiredOption("-l, --languages <list>", 'Comma separated list of languages to translate to. Supports de,es,it')
    .requiredOption("-s, --secret <string>", 'OpenAI API secret key')
    .option('-v, --verbose', 'verbosity that can be increased', increaseVerbosity, 0)

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
  log(1, `Currently translating: ${language}...`);

  return `I want you to act as an English to ${language} translator that can process JSON input and provide JSON output in the same structure. You will receive JSON data containing English text, and your task is to translate the text to ${language} while maintaining the structure of the JSON. Your responses should only include the translated text within the JSON structure. Please ensure that the JSON keys remain unchanged. Avoid providing additional explanations or altering the JSON structure. Here is the JSON input: ${JSON.stringify(
    JSON.parse(sourceCopy)
  )}
	`;
}

function getTranslation(configuration, prompt) {
  // Init the OpenAI SDK
  const openai = new OpenAIApi(configuration);
  return openai.createChatCompletion({
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

function log(requiredVerbosity, ...logs) {
    const options = program.opts();

    if (options.verbose >= requiredVerbosity) {
        console.log(...logs);
    }
}

module.exports = {
  init,
};

init();
