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
  const maxTokens = 2500;

  debug(3, `Number of tokens in source copy: ${encoded.length}`);
  raw(encode)
  const decoded = decode(encoded);
  raw("We can decode encoded tokens back into:\n", decoded);

  output("Translating JSON to different languages...");

  for (const languageIndex in languages) {
    const chunks = encoded.length > maxTokens ? splitJSON(JSON.parse(sourceCopy), 1500) : [JSON.parse(sourceCopy)]
    const language = languages[languageIndex];
    const promises = []

    for (const chunkIndex in chunks) {
      const chunk = chunks[chunkIndex]
      const prompt = setupPrompt(chunk, languageMap.get(language));

      debug(2, `Prompt: ${prompt}`);

      // Prompt the ChatGPT API to translate
      const completionPromise = getTranslation(configuration, prompt);
      completionPromise.then((response) => {
          raw(response);
          // Output the translated result(s)
          const data = response.data.choices[0].message.content;
          info(`Raw ChatGPT response: ${data}`);
      })
      promises.push(completionPromise)
    }

    // Stich back together the chunks
    Promise.all(promises).then((responses) => {
      debug('Merging responses together again...')
      const result = responses.map((response) => {
        const data = JSON.parse(response.data.choices[0].message.content);
        return data
      }).reduce((mergedJSON, chunk) => {
        return Object.assign(mergedJSON, chunk);
      }, {});

      debug(`Merged output: ${JSON.stringify(result, null, 2)}`)
      // Save result json to new file
      const outputFile = options.output.replace("{{lang}}", language);
      writeFile(outputFile, result);

      output("Done translating JSON to different languages.")
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
  languageMap.set("nl", "Dutch");
  return languageMap;
}

function splitJSON(jsonObj, maxTokens) {
  const chunks = [];

  for (const [key, value] of Object.entries(jsonObj)) {
    const chunk = `{"${key}": ${JSON.stringify(value)}}`
    const encodedChunk = encode(chunk);
    if (encodedChunk.length > maxTokens) {
      throw new Error(`JSON exceeding max token length.\nThis is the violating JSON:\n${chunk}`)
    }

    chunks.push(JSON.parse(chunk))
  }

  const outcome = chunks.reduce(
    (accumulator, value) => {
      if (accumulator.length == 0) {
        accumulator.push(value)
        return accumulator
      }

      const tokensOfLastIndex = encode(JSON.stringify(accumulator[accumulator.length - 1]))
      if (tokensOfLastIndex.length > maxTokens) {
        accumulator.push(value)
      } else {
        Object.assign(accumulator[accumulator.length - 1], value)
      }
      
      return accumulator
    },
    []
  )

  outcome.forEach((chunk) => {
    debug(`Encoded chunk length: ${encode(JSON.stringify(chunk)).length}`)
  })

  return outcome;
}

function setupPrompt(sourceCopy, language) {
  info(`Currently translating: ${language}...`);

  return `I want you to act as an English to ${language} translator that can process JSON input and provide JSON output in the same structure. You will receive JSON data containing English text, and your task is to translate the text to ${language} while maintaining the structure of the JSON. Your responses should only include the translated text within the JSON structure. Please ensure that the JSON keys remain unchanged. Avoid providing additional explanations or altering the JSON structure. Here is the JSON input: ${JSON.stringify(sourceCopy)}
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
  fs.writeFileSync(destination, JSON.stringify(data, null, 2));
}

function log(requiredVerbosity, ...logs) {
    const options = program.opts();

    if (options.verbose >= requiredVerbosity) {
        console.log(...logs);
    }
}

function output(...logs) {
  log(0, ...logs)
}

function info(...logs) {
  log(1, ...logs)
}

function debug(...logs) {
  log(2, ...logs)
}

function raw(...logs) {
  log(3, ...logs)
}

module.exports = {
  init,
};

init();
