//@ts-check

const x = {
    get commandConfig() {return require('../Commands/CommandConfig').config},
    get fileManagers() {return require('../Commands/CommandRunner').fileManagers},
    get fileCleanupFuncs() {return require('../Commands/CommandRunner').fileCleanupFuncs},
    get commandGlobals() {return require('../Commands/CommandRunnerGlobals')},
    get getPrefixStack() {return require('../Overrides/ErrorOverrides').getPrefixStack},
    get setPrefixStack() {return require('../Overrides/ErrorOverrides').setPrefixStack},
    get getRunningScriptName() {return require('../Overrides/ErrorOverrides').getRunningScriptName},
    get prettyPrepareStack() {return require('../Overrides/ErrorOverrides').prettyPrepareStack},
    get serverFunctions() {return require('../Server/Server').functions},
    get sharedServerData() {return require('../Server/SharedServerData').sharedServerData},
    get subscribables() {return require('../Server/Subscribable')},
    get launcher() {return require('./launcher')},
    verbose: false,
}
globalThis.clawffeeInternals = x;
module.exports = x;