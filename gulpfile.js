const { spawn } = require("child_process");
const { resolve } = require("path");
const { parallel, watch, series } = require("gulp");
const color = require("ansi-colors");
const rrimraf = require("rimraf");

/**
 * @type {import("child_process").ChildProcess}
 */
let lastAppProcess = null;

const appName = "easyRQ";
const appBundleName = "easyrq";
const appDistDir = "build";

function buildApp() {
  return spawn("go", ["build", "-i", "-o", `${appDistDir}/${appBundleName}`], {
    stdio: "inherit",
    cwd: resolve(__dirname, "./packages/cli")
  });
}

function runApp(...args) {
  return series([
    buildApp,
    cb => {
      lastAppProcess = spawn(
        resolve(__dirname, "./packages/cli", appDistDir, appBundleName),
        {
          stdio: "inherit"
        }
      );
      cb();
    }
  ])(...args);
}

// automatically rebuild and re-launch after files change
function appDev(cb) {
  watch(
    "./packages/cli/**/*.go",
    { ignoreInitial: false, useFsEvents: true },
    series([
      cb => {
        if (lastAppProcess) {
          console.log(color.red(`will kill ${lastAppProcess.pid}`));
          lastAppProcess.kill();
        }
        cb();
      },
      runApp
    ])
  );

  cb();
}

function buildUI(cb) {
  spawn("npm", ["run", "build"], {
    stdio: "inherit",
    cwd: resolve(__dirname, "./packages/webui")
  });
  cb();
}

function devServer(cb) {
  spawn("npm", ["run", "serve"], {
    stdio: "inherit",
    cwd: resolve(__dirname, "./packages/webui")
  });
  cb();
}

function clean(...args) {
  return parallel([cleanUI, cleanApp])(...args);
}

function cleanUI(cb) {
  rrimraf(resolve(__dirname, "./packages/webui/dist"), cb);
}

function cleanApp(cb) {
  rrimraf(resolve(__dirname, "./packages/cli/", appDistDir), cb);
}

module.exports = {
  buildApp,
  runApp,
  dev: parallel([appDev, devServer]),
  devServer,
  buildUI,
  clean,
  cleanUI,
  cleanApp
};
