//@ts-check
(async() => {
    const { config: server} = require('./internal/Server/Server');
    const updater = require('./internal/Plugins/Updater');
    while(!await updater.verifyModules());
    console.log("\n Join the discord! \u001b[32;1;3;4mhttps://discord.gg/744T53nJFu\u001b[0m");


    console.log("╴".repeat(32) + "╮");

    if(process.argv.includes('--verbose'))
        require('./internal/Overrides/verbose');

    // Global error handlers
    process.on('uncaughtException', (err) => {
        console.error("Uncaught Error!", err);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error("Unhandled Rejection!", "reason:", reason);
    });
    process.on('multipleResolves', (type, promise, reason) => {
        console.error("Multiple Resolves!", type, reason);
    });

    require('./internal/Overrides/ConsoleOverrides').bind();
    console.info(`server running on port ${server.port}`);
    const {runCommands} = require('./internal/Commands/CommandRunHelper');
    const { requirePluginsRecursively }  = require('./internal/Plugins/PluginLoader');
    requirePluginsRecursively(require('path').join(process.cwd(), 'plugins'));

    /**
    const worker = new Worker(
        require.resolve("./dashboard.js"), 
        {
            smol: true,
        }
    );
    worker.addEventListener("close", event => {
        console.log("exiting...")
        process.exit();
    });
    */

    runCommands('./commands');
})();