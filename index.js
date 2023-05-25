/*
 * How to use:
 * $ ai-translator-cli -i <JSON file to translate> -l <list of languages, comma separated, 2-letter code>
 */
const { program } = require('commander');
const fs = require('fs');

function init() {
    program
        .requiredOption('-i, --input <file>')
        .requiredOption('-l, --languages <list>');

    program.parse();

    const options = program.opts();

    // Load the JSON file
    const sourceCopy = fs.readFileSync(options.input, 'utf8');

    // Init the OpenAI SDK
    // Prompt the ChatGPT API to translate
    // Output the translated result(s)
}

module.exports = {
    init
};

init();