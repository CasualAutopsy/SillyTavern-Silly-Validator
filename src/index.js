import Ajv from "ajv";

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

const SlashCommandParser = await importFromUrl('/scripts/slash-commands/SlashCommandParser.js', 'SlashCommandParser');

const SlashCommand = await importFromUrl('/scripts/slash-commands/SlashCommand.js', 'SlashCommand');

const ARGUMENT_TYPE = await importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'ARGUMENT_TYPE');
const SlashCommandArgument = await importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'SlashCommandArgument');
const SlashCommandNamedArgument = await importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'SlashCommandNamedArgument');

const ajv = new Ajv();

async function validateVar(args, value) {
    const schemaCheck = ajv.validateSchema(args.schema);
    if (!schemaCheck) { throw new TypeError("Invalid schema"); }

    const typeCheck = ajv.validate(args.schema, value);
    if (!typeCheck && args.throwError) { throw new TypeError("Validation error.\nValue tested: " + value); }

    return typeCheck;
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
        SlashCommandNamedArgument.fromProps({
            name: "throwError",
            description: "throw an error instead of passing a boolean value down the pipe",
            typeList: [ARGUMENT_TYPE.BOOLEAN],
            isRequired: false,
            defaultValue: true,
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
