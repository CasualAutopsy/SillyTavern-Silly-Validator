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
    let schema;
    let val;

    try {
        schema = JSON.parse(args.schema);
    } catch {
        schema = args.schema;
    }

    try {
        val = JSON.parse(value);
    } catch {
        val = value;
    }

    const schemaCheck = ajv.validateSchema(schema);
    if (!schemaCheck) { throw new Error(`Invalid schema: ${schema}`); }

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
