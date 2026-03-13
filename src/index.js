import Ajv from "ajv";

const ajv = new Ajv();

async function importFromUrl(url, what, defaultValue = null) {
    try {
        const module = await import(/* webpackIgnore: true */ url);
        if (!Object.hasOwn(module, what)) {
            throw new Error(`No ${what} in module`);
        }
        return module[what];
    } catch (error) {
        console.error(`Failed to import ${what} from ${url}: ${error}`);
        return defaultValue;
    }
}

// Util imports
const isTrueBoolean = await importFromUrl('/scripts/utils.js', 'isTrueBoolean');

// Slash command related imports
const SlashCommandParser = await importFromUrl('/scripts/slash-commands/SlashCommandParser.js', 'SlashCommandParser');
const SlashCommand = await importFromUrl('/scripts/slash-commands/SlashCommand.js', 'SlashCommand');

// Argument related imports
const [ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument] = await Promise.all([
    importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'ARGUMENT_TYPE'),
    importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'SlashCommandArgument'),
    importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'SlashCommandNamedArgument'),
]);

/**
 * Parses a value string into its appropriate JavaScript type.
 * Attempts JSON parsing first, then numeric conversion, then boolean strings.
 * @param {string} value - The value string to parse
 * @returns {*} - The parsed value in its appropriate type
 */
function parseValue(value) {
    // Try JSON parsing first (handles objects, arrays, numbers, booleans, null)
    try {
        return JSON.parse(value);
    } catch {
        // Try numeric conversion for plain numbers
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            return numericValue;
        }
        // Handle boolean strings
        if (value === 'true' || value === 'false') {
            return isTrueBoolean(value);
        }
        // Return as string if no other conversion succeeds
        return value;
    }
}

/**
 * Validates a value against a JSON schema using Ajv.
 * Handles both pre-parsed and string-formatted schemas/values.
 * @param {Object} args - Arguments containing the schema
 * @param {string|Object} value - Value to validate (string or parsed value)
 * @returns {boolean} - Whether the value passes validation
 */
async function validateVar(args, value) {
    // Parse schema: try JSON first, fallback to object if already parsed
    const schema = typeof args.schema === 'string'
        ? JSON.parse(args.schema)
        : args.schema;

    // Parse value using helper function for flexible input formats
    const val = parseValue(value);

    // Validate schema before attempting validation
    const schemaCheck = ajv.validateSchema(schema);
    if (!schemaCheck) {
        throw new Error('Invalid schema provided');
    }

    return ajv.validate(schema, val);
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "silly-validator",
    aliases: ["st-validate"],
    callback: validateVar,
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: "schema",
            description: "schema to use for validation",
            typeList: [ARGUMENT_TYPE.DICTIONARY],
            isRequired: true,
            acceptsMultiple: false,
        }),
    ],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: "value to validate",
            typeList: [ARGUMENT_TYPE.STRING, ARGUMENT_TYPE.NUMBER, ARGUMENT_TYPE.BOOLEAN, ARGUMENT_TYPE.LIST, ARGUMENT_TYPE.DICTIONARY],
            isRequired: true,
            acceptsMultiple: false,
        }),
    ],
    splitUnnamedArgument: false,
    returns: 'boolean'
}));
